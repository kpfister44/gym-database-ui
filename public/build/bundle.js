var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/** @returns {{}} */
	function exclude_internal_props(props) {
		const result = {};
		for (const k in props) if (k[0] !== '$') result[k] = props[k];
		return result;
	}

	/** @returns {{}} */
	function compute_rest_props(props, keys) {
		const rest = {};
		keys = new Set(keys);
		for (const k in props) if (!keys.has(k) && k[0] !== '$') rest[k] = props[k];
		return rest;
	}

	/** @returns {{}} */
	function compute_slots(slots) {
		const result = {};
		for (const key in slots) {
			result[key] = true;
		}
		return result;
	}

	function action_destroyer(action_result) {
		return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}
	/**
	 * List of attributes that should always be set through the attr method,
	 * because updating them through the property setter doesn't work reliably.
	 * In the example of `width`/`height`, the problem is that the setter only
	 * accepts numeric values, but the attribute can also be set to a string like `50%`.
	 * If this list becomes too big, rethink this approach.
	 */
	const always_set_through_set_attribute = ['width', 'height'];

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {{ [x: string]: string }} attributes
	 * @returns {void}
	 */
	function set_attributes(node, attributes) {
		// @ts-ignore
		const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
		for (const key in attributes) {
			if (attributes[key] == null) {
				node.removeAttribute(key);
			} else if (key === 'style') {
				node.style.cssText = attributes[key];
			} else if (key === '__value') {
				/** @type {any} */ (node).value = node[key] = attributes[key];
			} else if (
				descriptors[key] &&
				descriptors[key].set &&
				always_set_through_set_attribute.indexOf(key) === -1
			) {
				node[key] = attributes[key];
			} else {
				attr(node, key, attributes[key]);
			}
		}
	}

	/**
	 * @param {Record<string, unknown>} data_map
	 * @returns {void}
	 */
	function set_custom_element_data_map(node, data_map) {
		Object.keys(data_map).forEach((key) => {
			set_custom_element_data(node, key, data_map[key]);
		});
	}

	/**
	 * @returns {void} */
	function set_custom_element_data(node, prop, value) {
		const lower = prop.toLowerCase(); // for backwards compatibility with existing behavior we do lowercase first
		if (lower in node) {
			node[lower] = typeof node[lower] === 'boolean' && value === '' ? true : value;
		} else if (prop in node) {
			node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
		} else {
			attr(node, prop, value);
		}
	}

	/**
	 * @param {string} tag
	 */
	function set_dynamic_element_data(tag) {
		return /-/.test(tag) ? set_custom_element_data_map : set_attributes;
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function select_option(select, value, mounting) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	function select_value(select) {
		const selected_option = select.querySelector(':checked');
		return selected_option && selected_option.__value;
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Associates an arbitrary `context` object with the current component and the specified `key`
	 * and returns that object. The context is then available to children of the component
	 * (including slotted content) with `getContext`.
	 *
	 * Like lifecycle functions, this must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#setcontext
	 * @template T
	 * @param {any} key
	 * @param {T} context
	 * @returns {T}
	 */
	function setContext(key, context) {
		get_current_component().$$.context.set(key, context);
		return context;
	}

	/**
	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
	 * Must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#getcontext
	 * @template T
	 * @param {any} key
	 * @returns {T}
	 */
	function getContext(key) {
		return get_current_component().$$.context.get(key);
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	/**
	 * @param component
	 * @param event
	 * @returns {void}
	 */
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];
		if (callbacks) {
			// @ts-ignore
			callbacks.slice().forEach((fn) => fn.call(this, event));
		}
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {{}} */
	function get_spread_update(levels, updates) {
		const update = {};
		const to_null_out = {};
		const accounted_for = { $$scope: 1 };
		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];
			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}
				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}
				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}
		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}
		return update;
	}

	function get_spread_object(spread_props) {
		return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
	}

	/** regex of all html void element names */
	const void_element_names =
		/^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	function is_void(name) {
		return void_element_names.test(name) || name.toLowerCase() === '!doctype';
	}

	/** @returns {void} */
	function bind(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.12';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Element} node
	 * @param {string} property
	 * @param {any} [value]
	 * @returns {void}
	 */
	function prop_dev(node, property, value) {
		node[property] = value;
		dispatch_dev('SvelteDOMSetProperty', { node, property, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * @param {unknown} tag
	 * @returns {void}
	 */
	function validate_dynamic_element(tag) {
		const is_string = typeof tag === 'string';
		if (tag && !is_string) {
			throw new Error('<svelte:element> expects "this" attribute to be a string.');
		}
	}

	/**
	 * @param {undefined | string} tag
	 * @returns {void}
	 */
	function validate_void_dynamic_element(tag) {
		if (tag && is_void(tag)) {
			console.warn(`<svelte:element this="${tag}"> is self-closing and cannot have content.`);
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	const CLASS_PART_SEPARATOR = '-';
	function createClassUtils(config) {
	  const classMap = createClassMap(config);
	  const {
	    conflictingClassGroups,
	    conflictingClassGroupModifiers
	  } = config;
	  function getClassGroupId(className) {
	    const classParts = className.split(CLASS_PART_SEPARATOR);
	    // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
	    if (classParts[0] === '' && classParts.length !== 1) {
	      classParts.shift();
	    }
	    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
	  }
	  function getConflictingClassGroupIds(classGroupId, hasPostfixModifier) {
	    const conflicts = conflictingClassGroups[classGroupId] || [];
	    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
	      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
	    }
	    return conflicts;
	  }
	  return {
	    getClassGroupId,
	    getConflictingClassGroupIds
	  };
	}
	function getGroupRecursive(classParts, classPartObject) {
	  if (classParts.length === 0) {
	    return classPartObject.classGroupId;
	  }
	  const currentClassPart = classParts[0];
	  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
	  const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : undefined;
	  if (classGroupFromNextClassPart) {
	    return classGroupFromNextClassPart;
	  }
	  if (classPartObject.validators.length === 0) {
	    return undefined;
	  }
	  const classRest = classParts.join(CLASS_PART_SEPARATOR);
	  return classPartObject.validators.find(({
	    validator
	  }) => validator(classRest))?.classGroupId;
	}
	const arbitraryPropertyRegex = /^\[(.+)\]$/;
	function getGroupIdForArbitraryProperty(className) {
	  if (arbitraryPropertyRegex.test(className)) {
	    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
	    const property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(':'));
	    if (property) {
	      // I use two dots here because one dot is used as prefix for class groups in plugins
	      return 'arbitrary..' + property;
	    }
	  }
	}
	/**
	 * Exported for testing only
	 */
	function createClassMap(config) {
	  const {
	    theme,
	    prefix
	  } = config;
	  const classMap = {
	    nextPart: new Map(),
	    validators: []
	  };
	  const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config.classGroups), prefix);
	  prefixedClassGroupEntries.forEach(([classGroupId, classGroup]) => {
	    processClassesRecursively(classGroup, classMap, classGroupId, theme);
	  });
	  return classMap;
	}
	function processClassesRecursively(classGroup, classPartObject, classGroupId, theme) {
	  classGroup.forEach(classDefinition => {
	    if (typeof classDefinition === 'string') {
	      const classPartObjectToEdit = classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition);
	      classPartObjectToEdit.classGroupId = classGroupId;
	      return;
	    }
	    if (typeof classDefinition === 'function') {
	      if (isThemeGetter(classDefinition)) {
	        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
	        return;
	      }
	      classPartObject.validators.push({
	        validator: classDefinition,
	        classGroupId
	      });
	      return;
	    }
	    Object.entries(classDefinition).forEach(([key, classGroup]) => {
	      processClassesRecursively(classGroup, getPart(classPartObject, key), classGroupId, theme);
	    });
	  });
	}
	function getPart(classPartObject, path) {
	  let currentClassPartObject = classPartObject;
	  path.split(CLASS_PART_SEPARATOR).forEach(pathPart => {
	    if (!currentClassPartObject.nextPart.has(pathPart)) {
	      currentClassPartObject.nextPart.set(pathPart, {
	        nextPart: new Map(),
	        validators: []
	      });
	    }
	    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
	  });
	  return currentClassPartObject;
	}
	function isThemeGetter(func) {
	  return func.isThemeGetter;
	}
	function getPrefixedClassGroupEntries(classGroupEntries, prefix) {
	  if (!prefix) {
	    return classGroupEntries;
	  }
	  return classGroupEntries.map(([classGroupId, classGroup]) => {
	    const prefixedClassGroup = classGroup.map(classDefinition => {
	      if (typeof classDefinition === 'string') {
	        return prefix + classDefinition;
	      }
	      if (typeof classDefinition === 'object') {
	        return Object.fromEntries(Object.entries(classDefinition).map(([key, value]) => [prefix + key, value]));
	      }
	      return classDefinition;
	    });
	    return [classGroupId, prefixedClassGroup];
	  });
	}

	// LRU cache inspired from hashlru (https://github.com/dominictarr/hashlru/blob/v1.0.4/index.js) but object replaced with Map to improve performance
	function createLruCache(maxCacheSize) {
	  if (maxCacheSize < 1) {
	    return {
	      get: () => undefined,
	      set: () => {}
	    };
	  }
	  let cacheSize = 0;
	  let cache = new Map();
	  let previousCache = new Map();
	  function update(key, value) {
	    cache.set(key, value);
	    cacheSize++;
	    if (cacheSize > maxCacheSize) {
	      cacheSize = 0;
	      previousCache = cache;
	      cache = new Map();
	    }
	  }
	  return {
	    get(key) {
	      let value = cache.get(key);
	      if (value !== undefined) {
	        return value;
	      }
	      if ((value = previousCache.get(key)) !== undefined) {
	        update(key, value);
	        return value;
	      }
	    },
	    set(key, value) {
	      if (cache.has(key)) {
	        cache.set(key, value);
	      } else {
	        update(key, value);
	      }
	    }
	  };
	}
	const IMPORTANT_MODIFIER = '!';
	function createSplitModifiers(config) {
	  const separator = config.separator;
	  const isSeparatorSingleCharacter = separator.length === 1;
	  const firstSeparatorCharacter = separator[0];
	  const separatorLength = separator.length;
	  // splitModifiers inspired by https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
	  return function splitModifiers(className) {
	    const modifiers = [];
	    let bracketDepth = 0;
	    let modifierStart = 0;
	    let postfixModifierPosition;
	    for (let index = 0; index < className.length; index++) {
	      let currentCharacter = className[index];
	      if (bracketDepth === 0) {
	        if (currentCharacter === firstSeparatorCharacter && (isSeparatorSingleCharacter || className.slice(index, index + separatorLength) === separator)) {
	          modifiers.push(className.slice(modifierStart, index));
	          modifierStart = index + separatorLength;
	          continue;
	        }
	        if (currentCharacter === '/') {
	          postfixModifierPosition = index;
	          continue;
	        }
	      }
	      if (currentCharacter === '[') {
	        bracketDepth++;
	      } else if (currentCharacter === ']') {
	        bracketDepth--;
	      }
	    }
	    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
	    const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
	    const baseClassName = hasImportantModifier ? baseClassNameWithImportantModifier.substring(1) : baseClassNameWithImportantModifier;
	    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : undefined;
	    return {
	      modifiers,
	      hasImportantModifier,
	      baseClassName,
	      maybePostfixModifierPosition
	    };
	  };
	}
	/**
	 * Sorts modifiers according to following schema:
	 * - Predefined modifiers are sorted alphabetically
	 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
	 */
	function sortModifiers(modifiers) {
	  if (modifiers.length <= 1) {
	    return modifiers;
	  }
	  const sortedModifiers = [];
	  let unsortedModifiers = [];
	  modifiers.forEach(modifier => {
	    const isArbitraryVariant = modifier[0] === '[';
	    if (isArbitraryVariant) {
	      sortedModifiers.push(...unsortedModifiers.sort(), modifier);
	      unsortedModifiers = [];
	    } else {
	      unsortedModifiers.push(modifier);
	    }
	  });
	  sortedModifiers.push(...unsortedModifiers.sort());
	  return sortedModifiers;
	}
	function createConfigUtils(config) {
	  return {
	    cache: createLruCache(config.cacheSize),
	    splitModifiers: createSplitModifiers(config),
	    ...createClassUtils(config)
	  };
	}
	const SPLIT_CLASSES_REGEX = /\s+/;
	function mergeClassList(classList, configUtils) {
	  const {
	    splitModifiers,
	    getClassGroupId,
	    getConflictingClassGroupIds
	  } = configUtils;
	  /**
	   * Set of classGroupIds in following format:
	   * `{importantModifier}{variantModifiers}{classGroupId}`
	   * @example 'float'
	   * @example 'hover:focus:bg-color'
	   * @example 'md:!pr'
	   */
	  const classGroupsInConflict = new Set();
	  return classList.trim().split(SPLIT_CLASSES_REGEX).map(originalClassName => {
	    const {
	      modifiers,
	      hasImportantModifier,
	      baseClassName,
	      maybePostfixModifierPosition
	    } = splitModifiers(originalClassName);
	    let classGroupId = getClassGroupId(maybePostfixModifierPosition ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
	    let hasPostfixModifier = Boolean(maybePostfixModifierPosition);
	    if (!classGroupId) {
	      if (!maybePostfixModifierPosition) {
	        return {
	          isTailwindClass: false,
	          originalClassName
	        };
	      }
	      classGroupId = getClassGroupId(baseClassName);
	      if (!classGroupId) {
	        return {
	          isTailwindClass: false,
	          originalClassName
	        };
	      }
	      hasPostfixModifier = false;
	    }
	    const variantModifier = sortModifiers(modifiers).join(':');
	    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
	    return {
	      isTailwindClass: true,
	      modifierId,
	      classGroupId,
	      originalClassName,
	      hasPostfixModifier
	    };
	  }).reverse()
	  // Last class in conflict wins, so we need to filter conflicting classes in reverse order.
	  .filter(parsed => {
	    if (!parsed.isTailwindClass) {
	      return true;
	    }
	    const {
	      modifierId,
	      classGroupId,
	      hasPostfixModifier
	    } = parsed;
	    const classId = modifierId + classGroupId;
	    if (classGroupsInConflict.has(classId)) {
	      return false;
	    }
	    classGroupsInConflict.add(classId);
	    getConflictingClassGroupIds(classGroupId, hasPostfixModifier).forEach(group => classGroupsInConflict.add(modifierId + group));
	    return true;
	  }).reverse().map(parsed => parsed.originalClassName).join(' ');
	}

	/**
	 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
	 *
	 * Specifically:
	 * - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
	 * - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
	 *
	 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
	 */
	function twJoin() {
	  let index = 0;
	  let argument;
	  let resolvedValue;
	  let string = '';
	  while (index < arguments.length) {
	    if (argument = arguments[index++]) {
	      if (resolvedValue = toValue(argument)) {
	        string && (string += ' ');
	        string += resolvedValue;
	      }
	    }
	  }
	  return string;
	}
	function toValue(mix) {
	  if (typeof mix === 'string') {
	    return mix;
	  }
	  let resolvedValue;
	  let string = '';
	  for (let k = 0; k < mix.length; k++) {
	    if (mix[k]) {
	      if (resolvedValue = toValue(mix[k])) {
	        string && (string += ' ');
	        string += resolvedValue;
	      }
	    }
	  }
	  return string;
	}
	function createTailwindMerge(createConfigFirst, ...createConfigRest) {
	  let configUtils;
	  let cacheGet;
	  let cacheSet;
	  let functionToCall = initTailwindMerge;
	  function initTailwindMerge(classList) {
	    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
	    configUtils = createConfigUtils(config);
	    cacheGet = configUtils.cache.get;
	    cacheSet = configUtils.cache.set;
	    functionToCall = tailwindMerge;
	    return tailwindMerge(classList);
	  }
	  function tailwindMerge(classList) {
	    const cachedResult = cacheGet(classList);
	    if (cachedResult) {
	      return cachedResult;
	    }
	    const result = mergeClassList(classList, configUtils);
	    cacheSet(classList, result);
	    return result;
	  }
	  return function callTailwindMerge() {
	    return functionToCall(twJoin.apply(null, arguments));
	  };
	}
	function fromTheme(key) {
	  const themeGetter = theme => theme[key] || [];
	  themeGetter.isThemeGetter = true;
	  return themeGetter;
	}
	const arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
	const fractionRegex = /^\d+\/\d+$/;
	const stringLengths = /*#__PURE__*/new Set(['px', 'full', 'screen']);
	const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
	const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
	const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
	// Shadow always begins with x and y offset separated by underscore
	const shadowRegex = /^-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
	const imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
	function isLength(value) {
	  return isNumber(value) || stringLengths.has(value) || fractionRegex.test(value);
	}
	function isArbitraryLength(value) {
	  return getIsArbitraryValue(value, 'length', isLengthOnly);
	}
	function isNumber(value) {
	  return Boolean(value) && !Number.isNaN(Number(value));
	}
	function isArbitraryNumber(value) {
	  return getIsArbitraryValue(value, 'number', isNumber);
	}
	function isInteger(value) {
	  return Boolean(value) && Number.isInteger(Number(value));
	}
	function isPercent(value) {
	  return value.endsWith('%') && isNumber(value.slice(0, -1));
	}
	function isArbitraryValue(value) {
	  return arbitraryValueRegex.test(value);
	}
	function isTshirtSize(value) {
	  return tshirtUnitRegex.test(value);
	}
	const sizeLabels = /*#__PURE__*/new Set(['length', 'size', 'percentage']);
	function isArbitrarySize(value) {
	  return getIsArbitraryValue(value, sizeLabels, isNever);
	}
	function isArbitraryPosition(value) {
	  return getIsArbitraryValue(value, 'position', isNever);
	}
	const imageLabels = /*#__PURE__*/new Set(['image', 'url']);
	function isArbitraryImage(value) {
	  return getIsArbitraryValue(value, imageLabels, isImage);
	}
	function isArbitraryShadow(value) {
	  return getIsArbitraryValue(value, '', isShadow);
	}
	function isAny() {
	  return true;
	}
	function getIsArbitraryValue(value, label, testValue) {
	  const result = arbitraryValueRegex.exec(value);
	  if (result) {
	    if (result[1]) {
	      return typeof label === 'string' ? result[1] === label : label.has(result[1]);
	    }
	    return testValue(result[2]);
	  }
	  return false;
	}
	function isLengthOnly(value) {
	  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
	  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
	  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
	  return lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
	}
	function isNever() {
	  return false;
	}
	function isShadow(value) {
	  return shadowRegex.test(value);
	}
	function isImage(value) {
	  return imageRegex.test(value);
	}
	function getDefaultConfig() {
	  const colors = fromTheme('colors');
	  const spacing = fromTheme('spacing');
	  const blur = fromTheme('blur');
	  const brightness = fromTheme('brightness');
	  const borderColor = fromTheme('borderColor');
	  const borderRadius = fromTheme('borderRadius');
	  const borderSpacing = fromTheme('borderSpacing');
	  const borderWidth = fromTheme('borderWidth');
	  const contrast = fromTheme('contrast');
	  const grayscale = fromTheme('grayscale');
	  const hueRotate = fromTheme('hueRotate');
	  const invert = fromTheme('invert');
	  const gap = fromTheme('gap');
	  const gradientColorStops = fromTheme('gradientColorStops');
	  const gradientColorStopPositions = fromTheme('gradientColorStopPositions');
	  const inset = fromTheme('inset');
	  const margin = fromTheme('margin');
	  const opacity = fromTheme('opacity');
	  const padding = fromTheme('padding');
	  const saturate = fromTheme('saturate');
	  const scale = fromTheme('scale');
	  const sepia = fromTheme('sepia');
	  const skew = fromTheme('skew');
	  const space = fromTheme('space');
	  const translate = fromTheme('translate');
	  const getOverscroll = () => ['auto', 'contain', 'none'];
	  const getOverflow = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'];
	  const getSpacingWithAutoAndArbitrary = () => ['auto', isArbitraryValue, spacing];
	  const getSpacingWithArbitrary = () => [isArbitraryValue, spacing];
	  const getLengthWithEmptyAndArbitrary = () => ['', isLength, isArbitraryLength];
	  const getNumberWithAutoAndArbitrary = () => ['auto', isNumber, isArbitraryValue];
	  const getPositions = () => ['bottom', 'center', 'left', 'left-bottom', 'left-top', 'right', 'right-bottom', 'right-top', 'top'];
	  const getLineStyles = () => ['solid', 'dashed', 'dotted', 'double', 'none'];
	  const getBlendModes = () => ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter'];
	  const getAlign = () => ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch'];
	  const getZeroAndEmpty = () => ['', '0', isArbitraryValue];
	  const getBreaks = () => ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'];
	  const getNumber = () => [isNumber, isArbitraryNumber];
	  const getNumberAndArbitrary = () => [isNumber, isArbitraryValue];
	  return {
	    cacheSize: 500,
	    separator: ':',
	    theme: {
	      colors: [isAny],
	      spacing: [isLength, isArbitraryLength],
	      blur: ['none', '', isTshirtSize, isArbitraryValue],
	      brightness: getNumber(),
	      borderColor: [colors],
	      borderRadius: ['none', '', 'full', isTshirtSize, isArbitraryValue],
	      borderSpacing: getSpacingWithArbitrary(),
	      borderWidth: getLengthWithEmptyAndArbitrary(),
	      contrast: getNumber(),
	      grayscale: getZeroAndEmpty(),
	      hueRotate: getNumberAndArbitrary(),
	      invert: getZeroAndEmpty(),
	      gap: getSpacingWithArbitrary(),
	      gradientColorStops: [colors],
	      gradientColorStopPositions: [isPercent, isArbitraryLength],
	      inset: getSpacingWithAutoAndArbitrary(),
	      margin: getSpacingWithAutoAndArbitrary(),
	      opacity: getNumber(),
	      padding: getSpacingWithArbitrary(),
	      saturate: getNumber(),
	      scale: getNumber(),
	      sepia: getZeroAndEmpty(),
	      skew: getNumberAndArbitrary(),
	      space: getSpacingWithArbitrary(),
	      translate: getSpacingWithArbitrary()
	    },
	    classGroups: {
	      // Layout
	      /**
	       * Aspect Ratio
	       * @see https://tailwindcss.com/docs/aspect-ratio
	       */
	      aspect: [{
	        aspect: ['auto', 'square', 'video', isArbitraryValue]
	      }],
	      /**
	       * Container
	       * @see https://tailwindcss.com/docs/container
	       */
	      container: ['container'],
	      /**
	       * Columns
	       * @see https://tailwindcss.com/docs/columns
	       */
	      columns: [{
	        columns: [isTshirtSize]
	      }],
	      /**
	       * Break After
	       * @see https://tailwindcss.com/docs/break-after
	       */
	      'break-after': [{
	        'break-after': getBreaks()
	      }],
	      /**
	       * Break Before
	       * @see https://tailwindcss.com/docs/break-before
	       */
	      'break-before': [{
	        'break-before': getBreaks()
	      }],
	      /**
	       * Break Inside
	       * @see https://tailwindcss.com/docs/break-inside
	       */
	      'break-inside': [{
	        'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column']
	      }],
	      /**
	       * Box Decoration Break
	       * @see https://tailwindcss.com/docs/box-decoration-break
	       */
	      'box-decoration': [{
	        'box-decoration': ['slice', 'clone']
	      }],
	      /**
	       * Box Sizing
	       * @see https://tailwindcss.com/docs/box-sizing
	       */
	      box: [{
	        box: ['border', 'content']
	      }],
	      /**
	       * Display
	       * @see https://tailwindcss.com/docs/display
	       */
	      display: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table', 'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group', 'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid', 'contents', 'list-item', 'hidden'],
	      /**
	       * Floats
	       * @see https://tailwindcss.com/docs/float
	       */
	      float: [{
	        float: ['right', 'left', 'none', 'start', 'end']
	      }],
	      /**
	       * Clear
	       * @see https://tailwindcss.com/docs/clear
	       */
	      clear: [{
	        clear: ['left', 'right', 'both', 'none', 'start', 'end']
	      }],
	      /**
	       * Isolation
	       * @see https://tailwindcss.com/docs/isolation
	       */
	      isolation: ['isolate', 'isolation-auto'],
	      /**
	       * Object Fit
	       * @see https://tailwindcss.com/docs/object-fit
	       */
	      'object-fit': [{
	        object: ['contain', 'cover', 'fill', 'none', 'scale-down']
	      }],
	      /**
	       * Object Position
	       * @see https://tailwindcss.com/docs/object-position
	       */
	      'object-position': [{
	        object: [...getPositions(), isArbitraryValue]
	      }],
	      /**
	       * Overflow
	       * @see https://tailwindcss.com/docs/overflow
	       */
	      overflow: [{
	        overflow: getOverflow()
	      }],
	      /**
	       * Overflow X
	       * @see https://tailwindcss.com/docs/overflow
	       */
	      'overflow-x': [{
	        'overflow-x': getOverflow()
	      }],
	      /**
	       * Overflow Y
	       * @see https://tailwindcss.com/docs/overflow
	       */
	      'overflow-y': [{
	        'overflow-y': getOverflow()
	      }],
	      /**
	       * Overscroll Behavior
	       * @see https://tailwindcss.com/docs/overscroll-behavior
	       */
	      overscroll: [{
	        overscroll: getOverscroll()
	      }],
	      /**
	       * Overscroll Behavior X
	       * @see https://tailwindcss.com/docs/overscroll-behavior
	       */
	      'overscroll-x': [{
	        'overscroll-x': getOverscroll()
	      }],
	      /**
	       * Overscroll Behavior Y
	       * @see https://tailwindcss.com/docs/overscroll-behavior
	       */
	      'overscroll-y': [{
	        'overscroll-y': getOverscroll()
	      }],
	      /**
	       * Position
	       * @see https://tailwindcss.com/docs/position
	       */
	      position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
	      /**
	       * Top / Right / Bottom / Left
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      inset: [{
	        inset: [inset]
	      }],
	      /**
	       * Right / Left
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      'inset-x': [{
	        'inset-x': [inset]
	      }],
	      /**
	       * Top / Bottom
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      'inset-y': [{
	        'inset-y': [inset]
	      }],
	      /**
	       * Start
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      start: [{
	        start: [inset]
	      }],
	      /**
	       * End
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      end: [{
	        end: [inset]
	      }],
	      /**
	       * Top
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      top: [{
	        top: [inset]
	      }],
	      /**
	       * Right
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      right: [{
	        right: [inset]
	      }],
	      /**
	       * Bottom
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      bottom: [{
	        bottom: [inset]
	      }],
	      /**
	       * Left
	       * @see https://tailwindcss.com/docs/top-right-bottom-left
	       */
	      left: [{
	        left: [inset]
	      }],
	      /**
	       * Visibility
	       * @see https://tailwindcss.com/docs/visibility
	       */
	      visibility: ['visible', 'invisible', 'collapse'],
	      /**
	       * Z-Index
	       * @see https://tailwindcss.com/docs/z-index
	       */
	      z: [{
	        z: ['auto', isInteger, isArbitraryValue]
	      }],
	      // Flexbox and Grid
	      /**
	       * Flex Basis
	       * @see https://tailwindcss.com/docs/flex-basis
	       */
	      basis: [{
	        basis: getSpacingWithAutoAndArbitrary()
	      }],
	      /**
	       * Flex Direction
	       * @see https://tailwindcss.com/docs/flex-direction
	       */
	      'flex-direction': [{
	        flex: ['row', 'row-reverse', 'col', 'col-reverse']
	      }],
	      /**
	       * Flex Wrap
	       * @see https://tailwindcss.com/docs/flex-wrap
	       */
	      'flex-wrap': [{
	        flex: ['wrap', 'wrap-reverse', 'nowrap']
	      }],
	      /**
	       * Flex
	       * @see https://tailwindcss.com/docs/flex
	       */
	      flex: [{
	        flex: ['1', 'auto', 'initial', 'none', isArbitraryValue]
	      }],
	      /**
	       * Flex Grow
	       * @see https://tailwindcss.com/docs/flex-grow
	       */
	      grow: [{
	        grow: getZeroAndEmpty()
	      }],
	      /**
	       * Flex Shrink
	       * @see https://tailwindcss.com/docs/flex-shrink
	       */
	      shrink: [{
	        shrink: getZeroAndEmpty()
	      }],
	      /**
	       * Order
	       * @see https://tailwindcss.com/docs/order
	       */
	      order: [{
	        order: ['first', 'last', 'none', isInteger, isArbitraryValue]
	      }],
	      /**
	       * Grid Template Columns
	       * @see https://tailwindcss.com/docs/grid-template-columns
	       */
	      'grid-cols': [{
	        'grid-cols': [isAny]
	      }],
	      /**
	       * Grid Column Start / End
	       * @see https://tailwindcss.com/docs/grid-column
	       */
	      'col-start-end': [{
	        col: ['auto', {
	          span: ['full', isInteger, isArbitraryValue]
	        }, isArbitraryValue]
	      }],
	      /**
	       * Grid Column Start
	       * @see https://tailwindcss.com/docs/grid-column
	       */
	      'col-start': [{
	        'col-start': getNumberWithAutoAndArbitrary()
	      }],
	      /**
	       * Grid Column End
	       * @see https://tailwindcss.com/docs/grid-column
	       */
	      'col-end': [{
	        'col-end': getNumberWithAutoAndArbitrary()
	      }],
	      /**
	       * Grid Template Rows
	       * @see https://tailwindcss.com/docs/grid-template-rows
	       */
	      'grid-rows': [{
	        'grid-rows': [isAny]
	      }],
	      /**
	       * Grid Row Start / End
	       * @see https://tailwindcss.com/docs/grid-row
	       */
	      'row-start-end': [{
	        row: ['auto', {
	          span: [isInteger, isArbitraryValue]
	        }, isArbitraryValue]
	      }],
	      /**
	       * Grid Row Start
	       * @see https://tailwindcss.com/docs/grid-row
	       */
	      'row-start': [{
	        'row-start': getNumberWithAutoAndArbitrary()
	      }],
	      /**
	       * Grid Row End
	       * @see https://tailwindcss.com/docs/grid-row
	       */
	      'row-end': [{
	        'row-end': getNumberWithAutoAndArbitrary()
	      }],
	      /**
	       * Grid Auto Flow
	       * @see https://tailwindcss.com/docs/grid-auto-flow
	       */
	      'grid-flow': [{
	        'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense']
	      }],
	      /**
	       * Grid Auto Columns
	       * @see https://tailwindcss.com/docs/grid-auto-columns
	       */
	      'auto-cols': [{
	        'auto-cols': ['auto', 'min', 'max', 'fr', isArbitraryValue]
	      }],
	      /**
	       * Grid Auto Rows
	       * @see https://tailwindcss.com/docs/grid-auto-rows
	       */
	      'auto-rows': [{
	        'auto-rows': ['auto', 'min', 'max', 'fr', isArbitraryValue]
	      }],
	      /**
	       * Gap
	       * @see https://tailwindcss.com/docs/gap
	       */
	      gap: [{
	        gap: [gap]
	      }],
	      /**
	       * Gap X
	       * @see https://tailwindcss.com/docs/gap
	       */
	      'gap-x': [{
	        'gap-x': [gap]
	      }],
	      /**
	       * Gap Y
	       * @see https://tailwindcss.com/docs/gap
	       */
	      'gap-y': [{
	        'gap-y': [gap]
	      }],
	      /**
	       * Justify Content
	       * @see https://tailwindcss.com/docs/justify-content
	       */
	      'justify-content': [{
	        justify: ['normal', ...getAlign()]
	      }],
	      /**
	       * Justify Items
	       * @see https://tailwindcss.com/docs/justify-items
	       */
	      'justify-items': [{
	        'justify-items': ['start', 'end', 'center', 'stretch']
	      }],
	      /**
	       * Justify Self
	       * @see https://tailwindcss.com/docs/justify-self
	       */
	      'justify-self': [{
	        'justify-self': ['auto', 'start', 'end', 'center', 'stretch']
	      }],
	      /**
	       * Align Content
	       * @see https://tailwindcss.com/docs/align-content
	       */
	      'align-content': [{
	        content: ['normal', ...getAlign(), 'baseline']
	      }],
	      /**
	       * Align Items
	       * @see https://tailwindcss.com/docs/align-items
	       */
	      'align-items': [{
	        items: ['start', 'end', 'center', 'baseline', 'stretch']
	      }],
	      /**
	       * Align Self
	       * @see https://tailwindcss.com/docs/align-self
	       */
	      'align-self': [{
	        self: ['auto', 'start', 'end', 'center', 'stretch', 'baseline']
	      }],
	      /**
	       * Place Content
	       * @see https://tailwindcss.com/docs/place-content
	       */
	      'place-content': [{
	        'place-content': [...getAlign(), 'baseline']
	      }],
	      /**
	       * Place Items
	       * @see https://tailwindcss.com/docs/place-items
	       */
	      'place-items': [{
	        'place-items': ['start', 'end', 'center', 'baseline', 'stretch']
	      }],
	      /**
	       * Place Self
	       * @see https://tailwindcss.com/docs/place-self
	       */
	      'place-self': [{
	        'place-self': ['auto', 'start', 'end', 'center', 'stretch']
	      }],
	      // Spacing
	      /**
	       * Padding
	       * @see https://tailwindcss.com/docs/padding
	       */
	      p: [{
	        p: [padding]
	      }],
	      /**
	       * Padding X
	       * @see https://tailwindcss.com/docs/padding
	       */
	      px: [{
	        px: [padding]
	      }],
	      /**
	       * Padding Y
	       * @see https://tailwindcss.com/docs/padding
	       */
	      py: [{
	        py: [padding]
	      }],
	      /**
	       * Padding Start
	       * @see https://tailwindcss.com/docs/padding
	       */
	      ps: [{
	        ps: [padding]
	      }],
	      /**
	       * Padding End
	       * @see https://tailwindcss.com/docs/padding
	       */
	      pe: [{
	        pe: [padding]
	      }],
	      /**
	       * Padding Top
	       * @see https://tailwindcss.com/docs/padding
	       */
	      pt: [{
	        pt: [padding]
	      }],
	      /**
	       * Padding Right
	       * @see https://tailwindcss.com/docs/padding
	       */
	      pr: [{
	        pr: [padding]
	      }],
	      /**
	       * Padding Bottom
	       * @see https://tailwindcss.com/docs/padding
	       */
	      pb: [{
	        pb: [padding]
	      }],
	      /**
	       * Padding Left
	       * @see https://tailwindcss.com/docs/padding
	       */
	      pl: [{
	        pl: [padding]
	      }],
	      /**
	       * Margin
	       * @see https://tailwindcss.com/docs/margin
	       */
	      m: [{
	        m: [margin]
	      }],
	      /**
	       * Margin X
	       * @see https://tailwindcss.com/docs/margin
	       */
	      mx: [{
	        mx: [margin]
	      }],
	      /**
	       * Margin Y
	       * @see https://tailwindcss.com/docs/margin
	       */
	      my: [{
	        my: [margin]
	      }],
	      /**
	       * Margin Start
	       * @see https://tailwindcss.com/docs/margin
	       */
	      ms: [{
	        ms: [margin]
	      }],
	      /**
	       * Margin End
	       * @see https://tailwindcss.com/docs/margin
	       */
	      me: [{
	        me: [margin]
	      }],
	      /**
	       * Margin Top
	       * @see https://tailwindcss.com/docs/margin
	       */
	      mt: [{
	        mt: [margin]
	      }],
	      /**
	       * Margin Right
	       * @see https://tailwindcss.com/docs/margin
	       */
	      mr: [{
	        mr: [margin]
	      }],
	      /**
	       * Margin Bottom
	       * @see https://tailwindcss.com/docs/margin
	       */
	      mb: [{
	        mb: [margin]
	      }],
	      /**
	       * Margin Left
	       * @see https://tailwindcss.com/docs/margin
	       */
	      ml: [{
	        ml: [margin]
	      }],
	      /**
	       * Space Between X
	       * @see https://tailwindcss.com/docs/space
	       */
	      'space-x': [{
	        'space-x': [space]
	      }],
	      /**
	       * Space Between X Reverse
	       * @see https://tailwindcss.com/docs/space
	       */
	      'space-x-reverse': ['space-x-reverse'],
	      /**
	       * Space Between Y
	       * @see https://tailwindcss.com/docs/space
	       */
	      'space-y': [{
	        'space-y': [space]
	      }],
	      /**
	       * Space Between Y Reverse
	       * @see https://tailwindcss.com/docs/space
	       */
	      'space-y-reverse': ['space-y-reverse'],
	      // Sizing
	      /**
	       * Width
	       * @see https://tailwindcss.com/docs/width
	       */
	      w: [{
	        w: ['auto', 'min', 'max', 'fit', 'svw', 'lvw', 'dvw', isArbitraryValue, spacing]
	      }],
	      /**
	       * Min-Width
	       * @see https://tailwindcss.com/docs/min-width
	       */
	      'min-w': [{
	        'min-w': [isArbitraryValue, spacing, 'min', 'max', 'fit']
	      }],
	      /**
	       * Max-Width
	       * @see https://tailwindcss.com/docs/max-width
	       */
	      'max-w': [{
	        'max-w': [isArbitraryValue, spacing, 'none', 'full', 'min', 'max', 'fit', 'prose', {
	          screen: [isTshirtSize]
	        }, isTshirtSize]
	      }],
	      /**
	       * Height
	       * @see https://tailwindcss.com/docs/height
	       */
	      h: [{
	        h: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
	      }],
	      /**
	       * Min-Height
	       * @see https://tailwindcss.com/docs/min-height
	       */
	      'min-h': [{
	        'min-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
	      }],
	      /**
	       * Max-Height
	       * @see https://tailwindcss.com/docs/max-height
	       */
	      'max-h': [{
	        'max-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
	      }],
	      /**
	       * Size
	       * @see https://tailwindcss.com/docs/size
	       */
	      size: [{
	        size: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit']
	      }],
	      // Typography
	      /**
	       * Font Size
	       * @see https://tailwindcss.com/docs/font-size
	       */
	      'font-size': [{
	        text: ['base', isTshirtSize, isArbitraryLength]
	      }],
	      /**
	       * Font Smoothing
	       * @see https://tailwindcss.com/docs/font-smoothing
	       */
	      'font-smoothing': ['antialiased', 'subpixel-antialiased'],
	      /**
	       * Font Style
	       * @see https://tailwindcss.com/docs/font-style
	       */
	      'font-style': ['italic', 'not-italic'],
	      /**
	       * Font Weight
	       * @see https://tailwindcss.com/docs/font-weight
	       */
	      'font-weight': [{
	        font: ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black', isArbitraryNumber]
	      }],
	      /**
	       * Font Family
	       * @see https://tailwindcss.com/docs/font-family
	       */
	      'font-family': [{
	        font: [isAny]
	      }],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-normal': ['normal-nums'],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-ordinal': ['ordinal'],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-slashed-zero': ['slashed-zero'],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-figure': ['lining-nums', 'oldstyle-nums'],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-spacing': ['proportional-nums', 'tabular-nums'],
	      /**
	       * Font Variant Numeric
	       * @see https://tailwindcss.com/docs/font-variant-numeric
	       */
	      'fvn-fraction': ['diagonal-fractions', 'stacked-fractons'],
	      /**
	       * Letter Spacing
	       * @see https://tailwindcss.com/docs/letter-spacing
	       */
	      tracking: [{
	        tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest', isArbitraryValue]
	      }],
	      /**
	       * Line Clamp
	       * @see https://tailwindcss.com/docs/line-clamp
	       */
	      'line-clamp': [{
	        'line-clamp': ['none', isNumber, isArbitraryNumber]
	      }],
	      /**
	       * Line Height
	       * @see https://tailwindcss.com/docs/line-height
	       */
	      leading: [{
	        leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', isLength, isArbitraryValue]
	      }],
	      /**
	       * List Style Image
	       * @see https://tailwindcss.com/docs/list-style-image
	       */
	      'list-image': [{
	        'list-image': ['none', isArbitraryValue]
	      }],
	      /**
	       * List Style Type
	       * @see https://tailwindcss.com/docs/list-style-type
	       */
	      'list-style-type': [{
	        list: ['none', 'disc', 'decimal', isArbitraryValue]
	      }],
	      /**
	       * List Style Position
	       * @see https://tailwindcss.com/docs/list-style-position
	       */
	      'list-style-position': [{
	        list: ['inside', 'outside']
	      }],
	      /**
	       * Placeholder Color
	       * @deprecated since Tailwind CSS v3.0.0
	       * @see https://tailwindcss.com/docs/placeholder-color
	       */
	      'placeholder-color': [{
	        placeholder: [colors]
	      }],
	      /**
	       * Placeholder Opacity
	       * @see https://tailwindcss.com/docs/placeholder-opacity
	       */
	      'placeholder-opacity': [{
	        'placeholder-opacity': [opacity]
	      }],
	      /**
	       * Text Alignment
	       * @see https://tailwindcss.com/docs/text-align
	       */
	      'text-alignment': [{
	        text: ['left', 'center', 'right', 'justify', 'start', 'end']
	      }],
	      /**
	       * Text Color
	       * @see https://tailwindcss.com/docs/text-color
	       */
	      'text-color': [{
	        text: [colors]
	      }],
	      /**
	       * Text Opacity
	       * @see https://tailwindcss.com/docs/text-opacity
	       */
	      'text-opacity': [{
	        'text-opacity': [opacity]
	      }],
	      /**
	       * Text Decoration
	       * @see https://tailwindcss.com/docs/text-decoration
	       */
	      'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
	      /**
	       * Text Decoration Style
	       * @see https://tailwindcss.com/docs/text-decoration-style
	       */
	      'text-decoration-style': [{
	        decoration: [...getLineStyles(), 'wavy']
	      }],
	      /**
	       * Text Decoration Thickness
	       * @see https://tailwindcss.com/docs/text-decoration-thickness
	       */
	      'text-decoration-thickness': [{
	        decoration: ['auto', 'from-font', isLength, isArbitraryLength]
	      }],
	      /**
	       * Text Underline Offset
	       * @see https://tailwindcss.com/docs/text-underline-offset
	       */
	      'underline-offset': [{
	        'underline-offset': ['auto', isLength, isArbitraryValue]
	      }],
	      /**
	       * Text Decoration Color
	       * @see https://tailwindcss.com/docs/text-decoration-color
	       */
	      'text-decoration-color': [{
	        decoration: [colors]
	      }],
	      /**
	       * Text Transform
	       * @see https://tailwindcss.com/docs/text-transform
	       */
	      'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
	      /**
	       * Text Overflow
	       * @see https://tailwindcss.com/docs/text-overflow
	       */
	      'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
	      /**
	       * Text Wrap
	       * @see https://tailwindcss.com/docs/text-wrap
	       */
	      'text-wrap': [{
	        text: ['wrap', 'nowrap', 'balance', 'pretty']
	      }],
	      /**
	       * Text Indent
	       * @see https://tailwindcss.com/docs/text-indent
	       */
	      indent: [{
	        indent: getSpacingWithArbitrary()
	      }],
	      /**
	       * Vertical Alignment
	       * @see https://tailwindcss.com/docs/vertical-align
	       */
	      'vertical-align': [{
	        align: ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom', 'sub', 'super', isArbitraryValue]
	      }],
	      /**
	       * Whitespace
	       * @see https://tailwindcss.com/docs/whitespace
	       */
	      whitespace: [{
	        whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']
	      }],
	      /**
	       * Word Break
	       * @see https://tailwindcss.com/docs/word-break
	       */
	      break: [{
	        break: ['normal', 'words', 'all', 'keep']
	      }],
	      /**
	       * Hyphens
	       * @see https://tailwindcss.com/docs/hyphens
	       */
	      hyphens: [{
	        hyphens: ['none', 'manual', 'auto']
	      }],
	      /**
	       * Content
	       * @see https://tailwindcss.com/docs/content
	       */
	      content: [{
	        content: ['none', isArbitraryValue]
	      }],
	      // Backgrounds
	      /**
	       * Background Attachment
	       * @see https://tailwindcss.com/docs/background-attachment
	       */
	      'bg-attachment': [{
	        bg: ['fixed', 'local', 'scroll']
	      }],
	      /**
	       * Background Clip
	       * @see https://tailwindcss.com/docs/background-clip
	       */
	      'bg-clip': [{
	        'bg-clip': ['border', 'padding', 'content', 'text']
	      }],
	      /**
	       * Background Opacity
	       * @deprecated since Tailwind CSS v3.0.0
	       * @see https://tailwindcss.com/docs/background-opacity
	       */
	      'bg-opacity': [{
	        'bg-opacity': [opacity]
	      }],
	      /**
	       * Background Origin
	       * @see https://tailwindcss.com/docs/background-origin
	       */
	      'bg-origin': [{
	        'bg-origin': ['border', 'padding', 'content']
	      }],
	      /**
	       * Background Position
	       * @see https://tailwindcss.com/docs/background-position
	       */
	      'bg-position': [{
	        bg: [...getPositions(), isArbitraryPosition]
	      }],
	      /**
	       * Background Repeat
	       * @see https://tailwindcss.com/docs/background-repeat
	       */
	      'bg-repeat': [{
	        bg: ['no-repeat', {
	          repeat: ['', 'x', 'y', 'round', 'space']
	        }]
	      }],
	      /**
	       * Background Size
	       * @see https://tailwindcss.com/docs/background-size
	       */
	      'bg-size': [{
	        bg: ['auto', 'cover', 'contain', isArbitrarySize]
	      }],
	      /**
	       * Background Image
	       * @see https://tailwindcss.com/docs/background-image
	       */
	      'bg-image': [{
	        bg: ['none', {
	          'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']
	        }, isArbitraryImage]
	      }],
	      /**
	       * Background Color
	       * @see https://tailwindcss.com/docs/background-color
	       */
	      'bg-color': [{
	        bg: [colors]
	      }],
	      /**
	       * Gradient Color Stops From Position
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-from-pos': [{
	        from: [gradientColorStopPositions]
	      }],
	      /**
	       * Gradient Color Stops Via Position
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-via-pos': [{
	        via: [gradientColorStopPositions]
	      }],
	      /**
	       * Gradient Color Stops To Position
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-to-pos': [{
	        to: [gradientColorStopPositions]
	      }],
	      /**
	       * Gradient Color Stops From
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-from': [{
	        from: [gradientColorStops]
	      }],
	      /**
	       * Gradient Color Stops Via
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-via': [{
	        via: [gradientColorStops]
	      }],
	      /**
	       * Gradient Color Stops To
	       * @see https://tailwindcss.com/docs/gradient-color-stops
	       */
	      'gradient-to': [{
	        to: [gradientColorStops]
	      }],
	      // Borders
	      /**
	       * Border Radius
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      rounded: [{
	        rounded: [borderRadius]
	      }],
	      /**
	       * Border Radius Start
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-s': [{
	        'rounded-s': [borderRadius]
	      }],
	      /**
	       * Border Radius End
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-e': [{
	        'rounded-e': [borderRadius]
	      }],
	      /**
	       * Border Radius Top
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-t': [{
	        'rounded-t': [borderRadius]
	      }],
	      /**
	       * Border Radius Right
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-r': [{
	        'rounded-r': [borderRadius]
	      }],
	      /**
	       * Border Radius Bottom
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-b': [{
	        'rounded-b': [borderRadius]
	      }],
	      /**
	       * Border Radius Left
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-l': [{
	        'rounded-l': [borderRadius]
	      }],
	      /**
	       * Border Radius Start Start
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-ss': [{
	        'rounded-ss': [borderRadius]
	      }],
	      /**
	       * Border Radius Start End
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-se': [{
	        'rounded-se': [borderRadius]
	      }],
	      /**
	       * Border Radius End End
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-ee': [{
	        'rounded-ee': [borderRadius]
	      }],
	      /**
	       * Border Radius End Start
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-es': [{
	        'rounded-es': [borderRadius]
	      }],
	      /**
	       * Border Radius Top Left
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-tl': [{
	        'rounded-tl': [borderRadius]
	      }],
	      /**
	       * Border Radius Top Right
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-tr': [{
	        'rounded-tr': [borderRadius]
	      }],
	      /**
	       * Border Radius Bottom Right
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-br': [{
	        'rounded-br': [borderRadius]
	      }],
	      /**
	       * Border Radius Bottom Left
	       * @see https://tailwindcss.com/docs/border-radius
	       */
	      'rounded-bl': [{
	        'rounded-bl': [borderRadius]
	      }],
	      /**
	       * Border Width
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w': [{
	        border: [borderWidth]
	      }],
	      /**
	       * Border Width X
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-x': [{
	        'border-x': [borderWidth]
	      }],
	      /**
	       * Border Width Y
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-y': [{
	        'border-y': [borderWidth]
	      }],
	      /**
	       * Border Width Start
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-s': [{
	        'border-s': [borderWidth]
	      }],
	      /**
	       * Border Width End
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-e': [{
	        'border-e': [borderWidth]
	      }],
	      /**
	       * Border Width Top
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-t': [{
	        'border-t': [borderWidth]
	      }],
	      /**
	       * Border Width Right
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-r': [{
	        'border-r': [borderWidth]
	      }],
	      /**
	       * Border Width Bottom
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-b': [{
	        'border-b': [borderWidth]
	      }],
	      /**
	       * Border Width Left
	       * @see https://tailwindcss.com/docs/border-width
	       */
	      'border-w-l': [{
	        'border-l': [borderWidth]
	      }],
	      /**
	       * Border Opacity
	       * @see https://tailwindcss.com/docs/border-opacity
	       */
	      'border-opacity': [{
	        'border-opacity': [opacity]
	      }],
	      /**
	       * Border Style
	       * @see https://tailwindcss.com/docs/border-style
	       */
	      'border-style': [{
	        border: [...getLineStyles(), 'hidden']
	      }],
	      /**
	       * Divide Width X
	       * @see https://tailwindcss.com/docs/divide-width
	       */
	      'divide-x': [{
	        'divide-x': [borderWidth]
	      }],
	      /**
	       * Divide Width X Reverse
	       * @see https://tailwindcss.com/docs/divide-width
	       */
	      'divide-x-reverse': ['divide-x-reverse'],
	      /**
	       * Divide Width Y
	       * @see https://tailwindcss.com/docs/divide-width
	       */
	      'divide-y': [{
	        'divide-y': [borderWidth]
	      }],
	      /**
	       * Divide Width Y Reverse
	       * @see https://tailwindcss.com/docs/divide-width
	       */
	      'divide-y-reverse': ['divide-y-reverse'],
	      /**
	       * Divide Opacity
	       * @see https://tailwindcss.com/docs/divide-opacity
	       */
	      'divide-opacity': [{
	        'divide-opacity': [opacity]
	      }],
	      /**
	       * Divide Style
	       * @see https://tailwindcss.com/docs/divide-style
	       */
	      'divide-style': [{
	        divide: getLineStyles()
	      }],
	      /**
	       * Border Color
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color': [{
	        border: [borderColor]
	      }],
	      /**
	       * Border Color X
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-x': [{
	        'border-x': [borderColor]
	      }],
	      /**
	       * Border Color Y
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-y': [{
	        'border-y': [borderColor]
	      }],
	      /**
	       * Border Color Top
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-t': [{
	        'border-t': [borderColor]
	      }],
	      /**
	       * Border Color Right
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-r': [{
	        'border-r': [borderColor]
	      }],
	      /**
	       * Border Color Bottom
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-b': [{
	        'border-b': [borderColor]
	      }],
	      /**
	       * Border Color Left
	       * @see https://tailwindcss.com/docs/border-color
	       */
	      'border-color-l': [{
	        'border-l': [borderColor]
	      }],
	      /**
	       * Divide Color
	       * @see https://tailwindcss.com/docs/divide-color
	       */
	      'divide-color': [{
	        divide: [borderColor]
	      }],
	      /**
	       * Outline Style
	       * @see https://tailwindcss.com/docs/outline-style
	       */
	      'outline-style': [{
	        outline: ['', ...getLineStyles()]
	      }],
	      /**
	       * Outline Offset
	       * @see https://tailwindcss.com/docs/outline-offset
	       */
	      'outline-offset': [{
	        'outline-offset': [isLength, isArbitraryValue]
	      }],
	      /**
	       * Outline Width
	       * @see https://tailwindcss.com/docs/outline-width
	       */
	      'outline-w': [{
	        outline: [isLength, isArbitraryLength]
	      }],
	      /**
	       * Outline Color
	       * @see https://tailwindcss.com/docs/outline-color
	       */
	      'outline-color': [{
	        outline: [colors]
	      }],
	      /**
	       * Ring Width
	       * @see https://tailwindcss.com/docs/ring-width
	       */
	      'ring-w': [{
	        ring: getLengthWithEmptyAndArbitrary()
	      }],
	      /**
	       * Ring Width Inset
	       * @see https://tailwindcss.com/docs/ring-width
	       */
	      'ring-w-inset': ['ring-inset'],
	      /**
	       * Ring Color
	       * @see https://tailwindcss.com/docs/ring-color
	       */
	      'ring-color': [{
	        ring: [colors]
	      }],
	      /**
	       * Ring Opacity
	       * @see https://tailwindcss.com/docs/ring-opacity
	       */
	      'ring-opacity': [{
	        'ring-opacity': [opacity]
	      }],
	      /**
	       * Ring Offset Width
	       * @see https://tailwindcss.com/docs/ring-offset-width
	       */
	      'ring-offset-w': [{
	        'ring-offset': [isLength, isArbitraryLength]
	      }],
	      /**
	       * Ring Offset Color
	       * @see https://tailwindcss.com/docs/ring-offset-color
	       */
	      'ring-offset-color': [{
	        'ring-offset': [colors]
	      }],
	      // Effects
	      /**
	       * Box Shadow
	       * @see https://tailwindcss.com/docs/box-shadow
	       */
	      shadow: [{
	        shadow: ['', 'inner', 'none', isTshirtSize, isArbitraryShadow]
	      }],
	      /**
	       * Box Shadow Color
	       * @see https://tailwindcss.com/docs/box-shadow-color
	       */
	      'shadow-color': [{
	        shadow: [isAny]
	      }],
	      /**
	       * Opacity
	       * @see https://tailwindcss.com/docs/opacity
	       */
	      opacity: [{
	        opacity: [opacity]
	      }],
	      /**
	       * Mix Blend Mode
	       * @see https://tailwindcss.com/docs/mix-blend-mode
	       */
	      'mix-blend': [{
	        'mix-blend': getBlendModes()
	      }],
	      /**
	       * Background Blend Mode
	       * @see https://tailwindcss.com/docs/background-blend-mode
	       */
	      'bg-blend': [{
	        'bg-blend': getBlendModes()
	      }],
	      // Filters
	      /**
	       * Filter
	       * @deprecated since Tailwind CSS v3.0.0
	       * @see https://tailwindcss.com/docs/filter
	       */
	      filter: [{
	        filter: ['', 'none']
	      }],
	      /**
	       * Blur
	       * @see https://tailwindcss.com/docs/blur
	       */
	      blur: [{
	        blur: [blur]
	      }],
	      /**
	       * Brightness
	       * @see https://tailwindcss.com/docs/brightness
	       */
	      brightness: [{
	        brightness: [brightness]
	      }],
	      /**
	       * Contrast
	       * @see https://tailwindcss.com/docs/contrast
	       */
	      contrast: [{
	        contrast: [contrast]
	      }],
	      /**
	       * Drop Shadow
	       * @see https://tailwindcss.com/docs/drop-shadow
	       */
	      'drop-shadow': [{
	        'drop-shadow': ['', 'none', isTshirtSize, isArbitraryValue]
	      }],
	      /**
	       * Grayscale
	       * @see https://tailwindcss.com/docs/grayscale
	       */
	      grayscale: [{
	        grayscale: [grayscale]
	      }],
	      /**
	       * Hue Rotate
	       * @see https://tailwindcss.com/docs/hue-rotate
	       */
	      'hue-rotate': [{
	        'hue-rotate': [hueRotate]
	      }],
	      /**
	       * Invert
	       * @see https://tailwindcss.com/docs/invert
	       */
	      invert: [{
	        invert: [invert]
	      }],
	      /**
	       * Saturate
	       * @see https://tailwindcss.com/docs/saturate
	       */
	      saturate: [{
	        saturate: [saturate]
	      }],
	      /**
	       * Sepia
	       * @see https://tailwindcss.com/docs/sepia
	       */
	      sepia: [{
	        sepia: [sepia]
	      }],
	      /**
	       * Backdrop Filter
	       * @deprecated since Tailwind CSS v3.0.0
	       * @see https://tailwindcss.com/docs/backdrop-filter
	       */
	      'backdrop-filter': [{
	        'backdrop-filter': ['', 'none']
	      }],
	      /**
	       * Backdrop Blur
	       * @see https://tailwindcss.com/docs/backdrop-blur
	       */
	      'backdrop-blur': [{
	        'backdrop-blur': [blur]
	      }],
	      /**
	       * Backdrop Brightness
	       * @see https://tailwindcss.com/docs/backdrop-brightness
	       */
	      'backdrop-brightness': [{
	        'backdrop-brightness': [brightness]
	      }],
	      /**
	       * Backdrop Contrast
	       * @see https://tailwindcss.com/docs/backdrop-contrast
	       */
	      'backdrop-contrast': [{
	        'backdrop-contrast': [contrast]
	      }],
	      /**
	       * Backdrop Grayscale
	       * @see https://tailwindcss.com/docs/backdrop-grayscale
	       */
	      'backdrop-grayscale': [{
	        'backdrop-grayscale': [grayscale]
	      }],
	      /**
	       * Backdrop Hue Rotate
	       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
	       */
	      'backdrop-hue-rotate': [{
	        'backdrop-hue-rotate': [hueRotate]
	      }],
	      /**
	       * Backdrop Invert
	       * @see https://tailwindcss.com/docs/backdrop-invert
	       */
	      'backdrop-invert': [{
	        'backdrop-invert': [invert]
	      }],
	      /**
	       * Backdrop Opacity
	       * @see https://tailwindcss.com/docs/backdrop-opacity
	       */
	      'backdrop-opacity': [{
	        'backdrop-opacity': [opacity]
	      }],
	      /**
	       * Backdrop Saturate
	       * @see https://tailwindcss.com/docs/backdrop-saturate
	       */
	      'backdrop-saturate': [{
	        'backdrop-saturate': [saturate]
	      }],
	      /**
	       * Backdrop Sepia
	       * @see https://tailwindcss.com/docs/backdrop-sepia
	       */
	      'backdrop-sepia': [{
	        'backdrop-sepia': [sepia]
	      }],
	      // Tables
	      /**
	       * Border Collapse
	       * @see https://tailwindcss.com/docs/border-collapse
	       */
	      'border-collapse': [{
	        border: ['collapse', 'separate']
	      }],
	      /**
	       * Border Spacing
	       * @see https://tailwindcss.com/docs/border-spacing
	       */
	      'border-spacing': [{
	        'border-spacing': [borderSpacing]
	      }],
	      /**
	       * Border Spacing X
	       * @see https://tailwindcss.com/docs/border-spacing
	       */
	      'border-spacing-x': [{
	        'border-spacing-x': [borderSpacing]
	      }],
	      /**
	       * Border Spacing Y
	       * @see https://tailwindcss.com/docs/border-spacing
	       */
	      'border-spacing-y': [{
	        'border-spacing-y': [borderSpacing]
	      }],
	      /**
	       * Table Layout
	       * @see https://tailwindcss.com/docs/table-layout
	       */
	      'table-layout': [{
	        table: ['auto', 'fixed']
	      }],
	      /**
	       * Caption Side
	       * @see https://tailwindcss.com/docs/caption-side
	       */
	      caption: [{
	        caption: ['top', 'bottom']
	      }],
	      // Transitions and Animation
	      /**
	       * Tranisition Property
	       * @see https://tailwindcss.com/docs/transition-property
	       */
	      transition: [{
	        transition: ['none', 'all', '', 'colors', 'opacity', 'shadow', 'transform', isArbitraryValue]
	      }],
	      /**
	       * Transition Duration
	       * @see https://tailwindcss.com/docs/transition-duration
	       */
	      duration: [{
	        duration: getNumberAndArbitrary()
	      }],
	      /**
	       * Transition Timing Function
	       * @see https://tailwindcss.com/docs/transition-timing-function
	       */
	      ease: [{
	        ease: ['linear', 'in', 'out', 'in-out', isArbitraryValue]
	      }],
	      /**
	       * Transition Delay
	       * @see https://tailwindcss.com/docs/transition-delay
	       */
	      delay: [{
	        delay: getNumberAndArbitrary()
	      }],
	      /**
	       * Animation
	       * @see https://tailwindcss.com/docs/animation
	       */
	      animate: [{
	        animate: ['none', 'spin', 'ping', 'pulse', 'bounce', isArbitraryValue]
	      }],
	      // Transforms
	      /**
	       * Transform
	       * @see https://tailwindcss.com/docs/transform
	       */
	      transform: [{
	        transform: ['', 'gpu', 'none']
	      }],
	      /**
	       * Scale
	       * @see https://tailwindcss.com/docs/scale
	       */
	      scale: [{
	        scale: [scale]
	      }],
	      /**
	       * Scale X
	       * @see https://tailwindcss.com/docs/scale
	       */
	      'scale-x': [{
	        'scale-x': [scale]
	      }],
	      /**
	       * Scale Y
	       * @see https://tailwindcss.com/docs/scale
	       */
	      'scale-y': [{
	        'scale-y': [scale]
	      }],
	      /**
	       * Rotate
	       * @see https://tailwindcss.com/docs/rotate
	       */
	      rotate: [{
	        rotate: [isInteger, isArbitraryValue]
	      }],
	      /**
	       * Translate X
	       * @see https://tailwindcss.com/docs/translate
	       */
	      'translate-x': [{
	        'translate-x': [translate]
	      }],
	      /**
	       * Translate Y
	       * @see https://tailwindcss.com/docs/translate
	       */
	      'translate-y': [{
	        'translate-y': [translate]
	      }],
	      /**
	       * Skew X
	       * @see https://tailwindcss.com/docs/skew
	       */
	      'skew-x': [{
	        'skew-x': [skew]
	      }],
	      /**
	       * Skew Y
	       * @see https://tailwindcss.com/docs/skew
	       */
	      'skew-y': [{
	        'skew-y': [skew]
	      }],
	      /**
	       * Transform Origin
	       * @see https://tailwindcss.com/docs/transform-origin
	       */
	      'transform-origin': [{
	        origin: ['center', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left', isArbitraryValue]
	      }],
	      // Interactivity
	      /**
	       * Accent Color
	       * @see https://tailwindcss.com/docs/accent-color
	       */
	      accent: [{
	        accent: ['auto', colors]
	      }],
	      /**
	       * Appearance
	       * @see https://tailwindcss.com/docs/appearance
	       */
	      appearance: [{
	        appearance: ['none', 'auto']
	      }],
	      /**
	       * Cursor
	       * @see https://tailwindcss.com/docs/cursor
	       */
	      cursor: [{
	        cursor: ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'n-resize', 'e-resize', 's-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize', 'zoom-in', 'zoom-out', isArbitraryValue]
	      }],
	      /**
	       * Caret Color
	       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
	       */
	      'caret-color': [{
	        caret: [colors]
	      }],
	      /**
	       * Pointer Events
	       * @see https://tailwindcss.com/docs/pointer-events
	       */
	      'pointer-events': [{
	        'pointer-events': ['none', 'auto']
	      }],
	      /**
	       * Resize
	       * @see https://tailwindcss.com/docs/resize
	       */
	      resize: [{
	        resize: ['none', 'y', 'x', '']
	      }],
	      /**
	       * Scroll Behavior
	       * @see https://tailwindcss.com/docs/scroll-behavior
	       */
	      'scroll-behavior': [{
	        scroll: ['auto', 'smooth']
	      }],
	      /**
	       * Scroll Margin
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-m': [{
	        'scroll-m': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin X
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-mx': [{
	        'scroll-mx': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Y
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-my': [{
	        'scroll-my': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Start
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-ms': [{
	        'scroll-ms': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin End
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-me': [{
	        'scroll-me': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Top
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-mt': [{
	        'scroll-mt': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Right
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-mr': [{
	        'scroll-mr': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Bottom
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-mb': [{
	        'scroll-mb': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Margin Left
	       * @see https://tailwindcss.com/docs/scroll-margin
	       */
	      'scroll-ml': [{
	        'scroll-ml': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-p': [{
	        'scroll-p': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding X
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-px': [{
	        'scroll-px': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Y
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-py': [{
	        'scroll-py': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Start
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-ps': [{
	        'scroll-ps': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding End
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-pe': [{
	        'scroll-pe': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Top
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-pt': [{
	        'scroll-pt': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Right
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-pr': [{
	        'scroll-pr': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Bottom
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-pb': [{
	        'scroll-pb': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Padding Left
	       * @see https://tailwindcss.com/docs/scroll-padding
	       */
	      'scroll-pl': [{
	        'scroll-pl': getSpacingWithArbitrary()
	      }],
	      /**
	       * Scroll Snap Align
	       * @see https://tailwindcss.com/docs/scroll-snap-align
	       */
	      'snap-align': [{
	        snap: ['start', 'end', 'center', 'align-none']
	      }],
	      /**
	       * Scroll Snap Stop
	       * @see https://tailwindcss.com/docs/scroll-snap-stop
	       */
	      'snap-stop': [{
	        snap: ['normal', 'always']
	      }],
	      /**
	       * Scroll Snap Type
	       * @see https://tailwindcss.com/docs/scroll-snap-type
	       */
	      'snap-type': [{
	        snap: ['none', 'x', 'y', 'both']
	      }],
	      /**
	       * Scroll Snap Type Strictness
	       * @see https://tailwindcss.com/docs/scroll-snap-type
	       */
	      'snap-strictness': [{
	        snap: ['mandatory', 'proximity']
	      }],
	      /**
	       * Touch Action
	       * @see https://tailwindcss.com/docs/touch-action
	       */
	      touch: [{
	        touch: ['auto', 'none', 'manipulation']
	      }],
	      /**
	       * Touch Action X
	       * @see https://tailwindcss.com/docs/touch-action
	       */
	      'touch-x': [{
	        'touch-pan': ['x', 'left', 'right']
	      }],
	      /**
	       * Touch Action Y
	       * @see https://tailwindcss.com/docs/touch-action
	       */
	      'touch-y': [{
	        'touch-pan': ['y', 'up', 'down']
	      }],
	      /**
	       * Touch Action Pinch Zoom
	       * @see https://tailwindcss.com/docs/touch-action
	       */
	      'touch-pz': ['touch-pinch-zoom'],
	      /**
	       * User Select
	       * @see https://tailwindcss.com/docs/user-select
	       */
	      select: [{
	        select: ['none', 'text', 'all', 'auto']
	      }],
	      /**
	       * Will Change
	       * @see https://tailwindcss.com/docs/will-change
	       */
	      'will-change': [{
	        'will-change': ['auto', 'scroll', 'contents', 'transform', isArbitraryValue]
	      }],
	      // SVG
	      /**
	       * Fill
	       * @see https://tailwindcss.com/docs/fill
	       */
	      fill: [{
	        fill: [colors, 'none']
	      }],
	      /**
	       * Stroke Width
	       * @see https://tailwindcss.com/docs/stroke-width
	       */
	      'stroke-w': [{
	        stroke: [isLength, isArbitraryLength, isArbitraryNumber]
	      }],
	      /**
	       * Stroke
	       * @see https://tailwindcss.com/docs/stroke
	       */
	      stroke: [{
	        stroke: [colors, 'none']
	      }],
	      // Accessibility
	      /**
	       * Screen Readers
	       * @see https://tailwindcss.com/docs/screen-readers
	       */
	      sr: ['sr-only', 'not-sr-only'],
	      /**
	       * Forced Color Adjust
	       * @see https://tailwindcss.com/docs/forced-color-adjust
	       */
	      'forced-color-adjust': [{
	        'forced-color-adjust': ['auto', 'none']
	      }]
	    },
	    conflictingClassGroups: {
	      overflow: ['overflow-x', 'overflow-y'],
	      overscroll: ['overscroll-x', 'overscroll-y'],
	      inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
	      'inset-x': ['right', 'left'],
	      'inset-y': ['top', 'bottom'],
	      flex: ['basis', 'grow', 'shrink'],
	      gap: ['gap-x', 'gap-y'],
	      p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
	      px: ['pr', 'pl'],
	      py: ['pt', 'pb'],
	      m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
	      mx: ['mr', 'ml'],
	      my: ['mt', 'mb'],
	      size: ['w', 'h'],
	      'font-size': ['leading'],
	      'fvn-normal': ['fvn-ordinal', 'fvn-slashed-zero', 'fvn-figure', 'fvn-spacing', 'fvn-fraction'],
	      'fvn-ordinal': ['fvn-normal'],
	      'fvn-slashed-zero': ['fvn-normal'],
	      'fvn-figure': ['fvn-normal'],
	      'fvn-spacing': ['fvn-normal'],
	      'fvn-fraction': ['fvn-normal'],
	      'line-clamp': ['display', 'overflow'],
	      rounded: ['rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-ss', 'rounded-se', 'rounded-ee', 'rounded-es', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl'],
	      'rounded-s': ['rounded-ss', 'rounded-es'],
	      'rounded-e': ['rounded-se', 'rounded-ee'],
	      'rounded-t': ['rounded-tl', 'rounded-tr'],
	      'rounded-r': ['rounded-tr', 'rounded-br'],
	      'rounded-b': ['rounded-br', 'rounded-bl'],
	      'rounded-l': ['rounded-tl', 'rounded-bl'],
	      'border-spacing': ['border-spacing-x', 'border-spacing-y'],
	      'border-w': ['border-w-s', 'border-w-e', 'border-w-t', 'border-w-r', 'border-w-b', 'border-w-l'],
	      'border-w-x': ['border-w-r', 'border-w-l'],
	      'border-w-y': ['border-w-t', 'border-w-b'],
	      'border-color': ['border-color-t', 'border-color-r', 'border-color-b', 'border-color-l'],
	      'border-color-x': ['border-color-r', 'border-color-l'],
	      'border-color-y': ['border-color-t', 'border-color-b'],
	      'scroll-m': ['scroll-mx', 'scroll-my', 'scroll-ms', 'scroll-me', 'scroll-mt', 'scroll-mr', 'scroll-mb', 'scroll-ml'],
	      'scroll-mx': ['scroll-mr', 'scroll-ml'],
	      'scroll-my': ['scroll-mt', 'scroll-mb'],
	      'scroll-p': ['scroll-px', 'scroll-py', 'scroll-ps', 'scroll-pe', 'scroll-pt', 'scroll-pr', 'scroll-pb', 'scroll-pl'],
	      'scroll-px': ['scroll-pr', 'scroll-pl'],
	      'scroll-py': ['scroll-pt', 'scroll-pb'],
	      touch: ['touch-x', 'touch-y', 'touch-pz'],
	      'touch-x': ['touch'],
	      'touch-y': ['touch'],
	      'touch-pz': ['touch']
	    },
	    conflictingClassGroupModifiers: {
	      'font-size': ['leading']
	    }
	  };
	}
	const twMerge = /*#__PURE__*/createTailwindMerge(getDefaultConfig);

	/* node_modules/flowbite-svelte/dist/utils/Frame.svelte generated by Svelte v4.2.12 */
	const file$o = "node_modules/flowbite-svelte/dist/utils/Frame.svelte";

	// (83:0) <svelte:element this={tag} use:use={options} bind:this={node} {role} {...$$restProps} class={divClass} on:click on:mouseenter on:mouseleave on:focusin on:focusout>
	function create_dynamic_element$4(ctx) {
		let svelte_element;
		let use_action;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[12].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

		let svelte_element_levels = [
			{ role: /*role*/ ctx[4] },
			/*$$restProps*/ ctx[6],
			{ class: /*divClass*/ ctx[5] }
		];

		let svelte_element_data = {};

		for (let i = 0; i < svelte_element_levels.length; i += 1) {
			svelte_element_data = assign(svelte_element_data, svelte_element_levels[i]);
		}

		const block = {
			c: function create() {
				svelte_element = element(/*tag*/ ctx[1]);
				if (default_slot) default_slot.c();
				set_dynamic_element_data(/*tag*/ ctx[1])(svelte_element, svelte_element_data);
				add_location(svelte_element, file$o, 82, 0, 3916);
			},
			m: function mount(target, anchor) {
				insert_dev(target, svelte_element, anchor);

				if (default_slot) {
					default_slot.m(svelte_element, null);
				}

				/*svelte_element_binding*/ ctx[18](svelte_element);
				current = true;

				if (!mounted) {
					dispose = [
						action_destroyer(use_action = /*use*/ ctx[2].call(null, svelte_element, /*options*/ ctx[3])),
						listen_dev(svelte_element, "click", /*click_handler*/ ctx[13], false, false, false, false),
						listen_dev(svelte_element, "mouseenter", /*mouseenter_handler*/ ctx[14], false, false, false, false),
						listen_dev(svelte_element, "mouseleave", /*mouseleave_handler*/ ctx[15], false, false, false, false),
						listen_dev(svelte_element, "focusin", /*focusin_handler*/ ctx[16], false, false, false, false),
						listen_dev(svelte_element, "focusout", /*focusout_handler*/ ctx[17], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[11],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
							null
						);
					}
				}

				set_dynamic_element_data(/*tag*/ ctx[1])(svelte_element, svelte_element_data = get_spread_update(svelte_element_levels, [
					(!current || dirty & /*role*/ 16) && { role: /*role*/ ctx[4] },
					dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6],
					(!current || dirty & /*divClass*/ 32) && { class: /*divClass*/ ctx[5] }
				]));

				if (use_action && is_function(use_action.update) && dirty & /*options*/ 8) use_action.update.call(null, /*options*/ ctx[3]);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element);
				}

				if (default_slot) default_slot.d(detaching);
				/*svelte_element_binding*/ ctx[18](null);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_dynamic_element$4.name,
			type: "child_dynamic_element",
			source: "(83:0) <svelte:element this={tag} use:use={options} bind:this={node} {role} {...$$restProps} class={divClass} on:click on:mouseenter on:mouseleave on:focusin on:focusout>",
			ctx
		});

		return block;
	}

	function create_fragment$o(ctx) {
		let previous_tag = /*tag*/ ctx[1];
		let svelte_element_anchor;
		let current;
		validate_dynamic_element(/*tag*/ ctx[1]);
		validate_void_dynamic_element(/*tag*/ ctx[1]);
		let svelte_element = /*tag*/ ctx[1] && create_dynamic_element$4(ctx);

		const block = {
			c: function create() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert_dev(target, svelte_element_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (/*tag*/ ctx[1]) {
					if (!previous_tag) {
						svelte_element = create_dynamic_element$4(ctx);
						previous_tag = /*tag*/ ctx[1];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*tag*/ ctx[1])) {
						svelte_element.d(1);
						validate_dynamic_element(/*tag*/ ctx[1]);
						validate_void_dynamic_element(/*tag*/ ctx[1]);
						svelte_element = create_dynamic_element$4(ctx);
						previous_tag = /*tag*/ ctx[1];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*tag*/ ctx[1];
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(svelte_element, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(svelte_element, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$o.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$o($$self, $$props, $$invalidate) {
		const omit_props_names = ["tag","color","rounded","border","shadow","node","use","options","role"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Frame', slots, ['default']);

		const noop = () => {
			
		};

		setContext('background', true);
		let { tag = $$restProps.href ? 'a' : 'div' } = $$props;
		let { color = 'default' } = $$props;
		let { rounded = false } = $$props;
		let { border = false } = $$props;
		let { shadow = false } = $$props;
		let { node = undefined } = $$props;
		let { use = noop } = $$props;
		let { options = {} } = $$props;
		let { role = undefined } = $$props;

		// your script goes here
		const bgColors = {
			gray: 'bg-gray-50 dark:bg-gray-800',
			red: 'bg-red-50 dark:bg-gray-800',
			yellow: 'bg-yellow-50 dark:bg-gray-800 ',
			green: 'bg-green-50 dark:bg-gray-800 ',
			indigo: 'bg-indigo-50 dark:bg-gray-800 ',
			purple: 'bg-purple-50 dark:bg-gray-800 ',
			pink: 'bg-pink-50 dark:bg-gray-800 ',
			blue: 'bg-blue-50 dark:bg-gray-800 ',
			light: 'bg-gray-50 dark:bg-gray-700',
			dark: 'bg-gray-50 dark:bg-gray-800',
			default: 'bg-white dark:bg-gray-800',
			dropdown: 'bg-white dark:bg-gray-700',
			navbar: 'bg-white dark:bg-gray-900',
			navbarUl: 'bg-gray-50 dark:bg-gray-800',
			form: 'bg-gray-50 dark:bg-gray-700',
			primary: 'bg-primary-50 dark:bg-gray-800 ',
			orange: 'bg-orange-50 dark:bg-orange-800',
			none: ''
		};

		const textColors = {
			gray: 'text-gray-800 dark:text-gray-300',
			red: 'text-red-800 dark:text-red-400',
			yellow: 'text-yellow-800 dark:text-yellow-300',
			green: 'text-green-800 dark:text-green-400',
			indigo: 'text-indigo-800 dark:text-indigo-400',
			purple: 'text-purple-800 dark:text-purple-400',
			pink: 'text-pink-800 dark:text-pink-400',
			blue: 'text-blue-800 dark:text-blue-400',
			light: 'text-gray-700 dark:text-gray-300',
			dark: 'text-gray-700 dark:text-gray-300',
			default: 'text-gray-500 dark:text-gray-400',
			dropdown: 'text-gray-700 dark:text-gray-200',
			navbar: 'text-gray-700 dark:text-gray-200',
			navbarUl: 'text-gray-700 dark:text-gray-400',
			form: 'text-gray-900 dark:text-white',
			primary: 'text-primary-800 dark:text-primary-400',
			orange: 'text-orange-800 dark:text-orange-400',
			none: ''
		};

		const borderColors = {
			gray: 'border-gray-300 dark:border-gray-800 divide-gray-300 dark:divide-gray-800',
			red: 'border-red-300 dark:border-red-800 divide-red-300 dark:divide-red-800',
			yellow: 'border-yellow-300 dark:border-yellow-800 divide-yellow-300 dark:divide-yellow-800',
			green: 'border-green-300 dark:border-green-800 divide-green-300 dark:divide-green-800',
			indigo: 'border-indigo-300 dark:border-indigo-800 divide-indigo-300 dark:divide-indigo-800',
			purple: 'border-purple-300 dark:border-purple-800 divide-purple-300 dark:divide-purple-800',
			pink: 'border-pink-300 dark:border-pink-800 divide-pink-300 dark:divide-pink-800',
			blue: 'border-blue-300 dark:border-blue-800 divide-blue-300 dark:divide-blue-800',
			light: 'border-gray-500 divide-gray-500',
			dark: 'border-gray-500 divide-gray-500',
			default: 'border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700',
			dropdown: 'border-gray-100 dark:border-gray-600 divide-gray-100 dark:divide-gray-600',
			navbar: 'border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700',
			navbarUl: 'border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700',
			form: 'border-gray-300 dark:border-gray-700 divide-gray-300 dark:divide-gray-700',
			primary: 'border-primary-500 dark:border-primary-200  divide-primary-500 dark:divide-primary-200 ',
			orange: 'border-orange-300 dark:border-orange-800 divide-orange-300 dark:divide-orange-800',
			none: ''
		};

		let divClass;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focusin_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focusout_handler(event) {
			bubble.call(this, $$self, event);
		}

		function svelte_element_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				node = $$value;
				$$invalidate(0, node);
			});
		}

		$$self.$$set = $$new_props => {
			$$invalidate(23, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('tag' in $$new_props) $$invalidate(1, tag = $$new_props.tag);
			if ('color' in $$new_props) $$invalidate(7, color = $$new_props.color);
			if ('rounded' in $$new_props) $$invalidate(8, rounded = $$new_props.rounded);
			if ('border' in $$new_props) $$invalidate(9, border = $$new_props.border);
			if ('shadow' in $$new_props) $$invalidate(10, shadow = $$new_props.shadow);
			if ('node' in $$new_props) $$invalidate(0, node = $$new_props.node);
			if ('use' in $$new_props) $$invalidate(2, use = $$new_props.use);
			if ('options' in $$new_props) $$invalidate(3, options = $$new_props.options);
			if ('role' in $$new_props) $$invalidate(4, role = $$new_props.role);
			if ('$$scope' in $$new_props) $$invalidate(11, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			setContext,
			twMerge,
			noop,
			tag,
			color,
			rounded,
			border,
			shadow,
			node,
			use,
			options,
			role,
			bgColors,
			textColors,
			borderColors,
			divClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(23, $$props = assign(assign({}, $$props), $$new_props));
			if ('tag' in $$props) $$invalidate(1, tag = $$new_props.tag);
			if ('color' in $$props) $$invalidate(7, color = $$new_props.color);
			if ('rounded' in $$props) $$invalidate(8, rounded = $$new_props.rounded);
			if ('border' in $$props) $$invalidate(9, border = $$new_props.border);
			if ('shadow' in $$props) $$invalidate(10, shadow = $$new_props.shadow);
			if ('node' in $$props) $$invalidate(0, node = $$new_props.node);
			if ('use' in $$props) $$invalidate(2, use = $$new_props.use);
			if ('options' in $$props) $$invalidate(3, options = $$new_props.options);
			if ('role' in $$props) $$invalidate(4, role = $$new_props.role);
			if ('divClass' in $$props) $$invalidate(5, divClass = $$new_props.divClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*color*/ 128) {
				$$invalidate(7, color = color ?? 'default'); // for cases when undefined
			}

			if ($$self.$$.dirty & /*color*/ 128) {
				setContext('color', color);
			}

			$$invalidate(5, divClass = twMerge(bgColors[color], textColors[color], rounded && 'rounded-lg', border && 'border', borderColors[color], shadow && 'shadow-md', $$props.class));
		};

		$$props = exclude_internal_props($$props);

		return [
			node,
			tag,
			use,
			options,
			role,
			divClass,
			$$restProps,
			color,
			rounded,
			border,
			shadow,
			$$scope,
			slots,
			click_handler,
			mouseenter_handler,
			mouseleave_handler,
			focusin_handler,
			focusout_handler,
			svelte_element_binding
		];
	}

	class Frame extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$o, create_fragment$o, safe_not_equal, {
				tag: 1,
				color: 7,
				rounded: 8,
				border: 9,
				shadow: 10,
				node: 0,
				use: 2,
				options: 3,
				role: 4
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Frame",
				options,
				id: create_fragment$o.name
			});
		}

		get tag() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tag(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get rounded() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set rounded(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get border() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set border(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get shadow() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set shadow(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get node() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set node(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get use() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set use(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get options() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set options(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get role() {
			throw new Error("<Frame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set role(value) {
			throw new Error("<Frame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/buttons/Button.svelte generated by Svelte v4.2.12 */
	const file$n = "node_modules/flowbite-svelte/dist/buttons/Button.svelte";

	// (93:0) {:else}
	function create_else_block$b(ctx) {
		let previous_tag = /*tag*/ ctx[2];
		let svelte_element_anchor;
		let current;
		validate_dynamic_element(/*tag*/ ctx[2]);
		validate_void_dynamic_element(/*tag*/ ctx[2]);
		let svelte_element = /*tag*/ ctx[2] && create_dynamic_element$3(ctx);

		const block = {
			c: function create() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert_dev(target, svelte_element_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*tag*/ ctx[2]) {
					if (!previous_tag) {
						svelte_element = create_dynamic_element$3(ctx);
						previous_tag = /*tag*/ ctx[2];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*tag*/ ctx[2])) {
						svelte_element.d(1);
						validate_dynamic_element(/*tag*/ ctx[2]);
						validate_void_dynamic_element(/*tag*/ ctx[2]);
						svelte_element = create_dynamic_element$3(ctx);
						previous_tag = /*tag*/ ctx[2];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*tag*/ ctx[2];
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(svelte_element, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(svelte_element, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$b.name,
			type: "else",
			source: "(93:0) {:else}",
			ctx
		});

		return block;
	}

	// (89:27) 
	function create_if_block_1$9(ctx) {
		let button;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[12].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

		let button_levels = [
			{ type: /*type*/ ctx[1] },
			/*$$restProps*/ ctx[4],
			{ class: /*buttonClass*/ ctx[3] }
		];

		let button_data = {};

		for (let i = 0; i < button_levels.length; i += 1) {
			button_data = assign(button_data, button_levels[i]);
		}

		const block = {
			c: function create() {
				button = element("button");
				if (default_slot) default_slot.c();
				set_attributes(button, button_data);
				add_location(button, file$n, 89, 2, 7622);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (default_slot) {
					default_slot.m(button, null);
				}

				if (button.autofocus) button.focus();
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button, "click", /*click_handler_1*/ ctx[22], false, false, false, false),
						listen_dev(button, "change", /*change_handler_1*/ ctx[23], false, false, false, false),
						listen_dev(button, "keydown", /*keydown_handler_1*/ ctx[24], false, false, false, false),
						listen_dev(button, "keyup", /*keyup_handler_1*/ ctx[25], false, false, false, false),
						listen_dev(button, "touchstart", /*touchstart_handler_1*/ ctx[26], { passive: true }, false, false, false),
						listen_dev(button, "touchend", /*touchend_handler_1*/ ctx[27], false, false, false, false),
						listen_dev(button, "touchcancel", /*touchcancel_handler_1*/ ctx[28], false, false, false, false),
						listen_dev(button, "mouseenter", /*mouseenter_handler_1*/ ctx[29], false, false, false, false),
						listen_dev(button, "mouseleave", /*mouseleave_handler_1*/ ctx[30], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 2048)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[11],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
							null
						);
					}
				}

				set_attributes(button, button_data = get_spread_update(button_levels, [
					(!current || dirty[0] & /*type*/ 2) && { type: /*type*/ ctx[1] },
					dirty[0] & /*$$restProps*/ 16 && /*$$restProps*/ ctx[4],
					(!current || dirty[0] & /*buttonClass*/ 8) && { class: /*buttonClass*/ ctx[3] }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$9.name,
			type: "if",
			source: "(89:27) ",
			ctx
		});

		return block;
	}

	// (85:0) {#if href}
	function create_if_block$f(ctx) {
		let a;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[12].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

		let a_levels = [
			{ href: /*href*/ ctx[0] },
			/*$$restProps*/ ctx[4],
			{ class: /*buttonClass*/ ctx[3] },
			{ role: "button" }
		];

		let a_data = {};

		for (let i = 0; i < a_levels.length; i += 1) {
			a_data = assign(a_data, a_levels[i]);
		}

		const block = {
			c: function create() {
				a = element("a");
				if (default_slot) default_slot.c();
				set_attributes(a, a_data);
				add_location(a, file$n, 85, 2, 7394);
			},
			m: function mount(target, anchor) {
				insert_dev(target, a, anchor);

				if (default_slot) {
					default_slot.m(a, null);
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(a, "click", /*click_handler*/ ctx[13], false, false, false, false),
						listen_dev(a, "change", /*change_handler*/ ctx[14], false, false, false, false),
						listen_dev(a, "keydown", /*keydown_handler*/ ctx[15], false, false, false, false),
						listen_dev(a, "keyup", /*keyup_handler*/ ctx[16], false, false, false, false),
						listen_dev(a, "touchstart", /*touchstart_handler*/ ctx[17], { passive: true }, false, false, false),
						listen_dev(a, "touchend", /*touchend_handler*/ ctx[18], false, false, false, false),
						listen_dev(a, "touchcancel", /*touchcancel_handler*/ ctx[19], false, false, false, false),
						listen_dev(a, "mouseenter", /*mouseenter_handler*/ ctx[20], false, false, false, false),
						listen_dev(a, "mouseleave", /*mouseleave_handler*/ ctx[21], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 2048)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[11],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
							null
						);
					}
				}

				set_attributes(a, a_data = get_spread_update(a_levels, [
					(!current || dirty[0] & /*href*/ 1) && { href: /*href*/ ctx[0] },
					dirty[0] & /*$$restProps*/ 16 && /*$$restProps*/ ctx[4],
					(!current || dirty[0] & /*buttonClass*/ 8) && { class: /*buttonClass*/ ctx[3] },
					{ role: "button" }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(a);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$f.name,
			type: "if",
			source: "(85:0) {#if href}",
			ctx
		});

		return block;
	}

	// (94:2) <svelte:element this={tag} {...$$restProps} class={buttonClass}>
	function create_dynamic_element$3(ctx) {
		let svelte_element;
		let current;
		const default_slot_template = /*#slots*/ ctx[12].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);
		let svelte_element_levels = [/*$$restProps*/ ctx[4], { class: /*buttonClass*/ ctx[3] }];
		let svelte_element_data = {};

		for (let i = 0; i < svelte_element_levels.length; i += 1) {
			svelte_element_data = assign(svelte_element_data, svelte_element_levels[i]);
		}

		const block = {
			c: function create() {
				svelte_element = element(/*tag*/ ctx[2]);
				if (default_slot) default_slot.c();
				set_dynamic_element_data(/*tag*/ ctx[2])(svelte_element, svelte_element_data);
				add_location(svelte_element, file$n, 93, 2, 7826);
			},
			m: function mount(target, anchor) {
				insert_dev(target, svelte_element, anchor);

				if (default_slot) {
					default_slot.m(svelte_element, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 2048)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[11],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
							null
						);
					}
				}

				set_dynamic_element_data(/*tag*/ ctx[2])(svelte_element, svelte_element_data = get_spread_update(svelte_element_levels, [
					dirty[0] & /*$$restProps*/ 16 && /*$$restProps*/ ctx[4],
					(!current || dirty[0] & /*buttonClass*/ 8) && { class: /*buttonClass*/ ctx[3] }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_dynamic_element$3.name,
			type: "child_dynamic_element",
			source: "(94:2) <svelte:element this={tag} {...$$restProps} class={buttonClass}>",
			ctx
		});

		return block;
	}

	function create_fragment$n(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$f, create_if_block_1$9, create_else_block$b];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*href*/ ctx[0]) return 0;
			if (/*tag*/ ctx[2] === 'button') return 1;
			return 2;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$n.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$n($$self, $$props, $$invalidate) {
		const omit_props_names = ["pill","outline","size","href","type","color","shadow","tag","checked"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Button', slots, ['default']);
		const group = getContext('group');
		let { pill = false } = $$props;
		let { outline = false } = $$props;
		let { size = group ? 'sm' : 'md' } = $$props;
		let { href = undefined } = $$props;
		let { type = 'button' } = $$props;
		let { color = group ? outline ? 'dark' : 'alternative' : 'primary' } = $$props;
		let { shadow = false } = $$props;
		let { tag = 'button' } = $$props;
		let { checked = undefined } = $$props;

		const colorClasses = {
			alternative: 'text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 hover:text-primary-700 focus-within:text-primary-700 dark:focus-within:text-white dark:hover:text-white dark:hover:bg-gray-700',
			blue: 'text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700',
			dark: 'text-white bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700',
			green: 'text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700',
			light: 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600',
			primary: 'text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700',
			purple: 'text-white bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700',
			red: 'text-white bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
			yellow: 'text-white bg-yellow-400 hover:bg-yellow-500 ',
			none: ''
		};

		const colorCheckedClasses = {
			alternative: 'text-primary-700 border dark:text-primary-500 bg-gray-100 dark:bg-gray-700 border-gray-300 shadow-gray-300 dark:shadow-gray-800 shadow-inner',
			blue: 'text-blue-900 bg-blue-400 dark:bg-blue-500 shadow-blue-700 dark:shadow-blue-800 shadow-inner',
			dark: 'text-white bg-gray-500 dark:bg-gray-600 shadow-gray-800 dark:shadow-gray-900 shadow-inner',
			green: 'text-green-900 bg-green-400 dark:bg-green-500 shadow-green-700 dark:shadow-green-800 shadow-inner',
			light: 'text-gray-900 bg-gray-100 border border-gray-300 dark:bg-gray-500 dark:text-gray-900 dark:border-gray-700 shadow-gray-300 dark:shadow-gray-700 shadow-inner',
			primary: 'text-primary-900 bg-primary-400 dark:bg-primary-500 shadow-primary-700 dark:shadow-primary-800 shadow-inner',
			purple: 'text-purple-900 bg-purple-400 dark:bg-purple-500 shadow-purple-700 dark:shadow-purple-800 shadow-inner',
			red: 'text-red-900 bg-red-400 dark:bg-red-500 shadow-red-700 dark:shadow-red-800 shadow-inner',
			yellow: 'text-yellow-900 bg-yellow-300 dark:bg-yellow-400 shadow-yellow-500 dark:shadow-yellow-700 shadow-inner',
			none: ''
		};

		const coloredFocusClasses = {
			alternative: 'focus-within:ring-gray-200 dark:focus-within:ring-gray-700',
			blue: 'focus-within:ring-blue-300 dark:focus-within:ring-blue-800',
			dark: 'focus-within:ring-gray-300 dark:focus-within:ring-gray-700',
			green: 'focus-within:ring-green-300 dark:focus-within:ring-green-800',
			light: 'focus-within:ring-gray-200 dark:focus-within:ring-gray-700',
			primary: 'focus-within:ring-primary-300 dark:focus-within:ring-primary-800',
			purple: 'focus-within:ring-purple-300 dark:focus-within:ring-purple-900',
			red: 'focus-within:ring-red-300 dark:focus-within:ring-red-900',
			yellow: 'focus-within:ring-yellow-300 dark:focus-within:ring-yellow-900',
			none: ''
		};

		const coloredShadowClasses = {
			alternative: 'shadow-gray-500/50 dark:shadow-gray-800/80',
			blue: 'shadow-blue-500/50 dark:shadow-blue-800/80',
			dark: 'shadow-gray-500/50 dark:shadow-gray-800/80',
			green: 'shadow-green-500/50 dark:shadow-green-800/80',
			light: 'shadow-gray-500/50 dark:shadow-gray-800/80',
			primary: 'shadow-primary-500/50 dark:shadow-primary-800/80',
			purple: 'shadow-purple-500/50 dark:shadow-purple-800/80',
			red: 'shadow-red-500/50 dark:shadow-red-800/80 ',
			yellow: 'shadow-yellow-500/50 dark:shadow-yellow-800/80 ',
			none: ''
		};

		const outlineClasses = {
			alternative: 'text-gray-900 dark:text-gray-400 hover:text-white border border-gray-800 hover:bg-gray-900 focus-within:bg-gray-900 focus-within:text-white focus-within:ring-gray-300 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600 dark:focus-within:ring-gray-800',
			blue: 'text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-600',
			dark: 'text-gray-900 hover:text-white border border-gray-800 hover:bg-gray-900 focus-within:bg-gray-900 focus-within:text-white dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600',
			green: 'text-green-700 hover:text-white border border-green-700 hover:bg-green-800 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600',
			light: 'text-gray-500 hover:text-gray-900 bg-white border border-gray-200 dark:border-gray-600 dark:hover:text-white dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600',
			primary: 'text-primary-700 hover:text-white border border-primary-700 hover:bg-primary-700 dark:border-primary-500 dark:text-primary-500 dark:hover:text-white dark:hover:bg-primary-600',
			purple: 'text-purple-700 hover:text-white border border-purple-700 hover:bg-purple-800 dark:border-purple-400 dark:text-purple-400 dark:hover:text-white dark:hover:bg-purple-500',
			red: 'text-red-700 hover:text-white border border-red-700 hover:bg-red-800 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600',
			yellow: 'text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 dark:border-yellow-300 dark:text-yellow-300 dark:hover:text-white dark:hover:bg-yellow-400',
			none: ''
		};

		const sizeClasses = {
			xs: 'px-3 py-2 text-xs',
			sm: 'px-4 py-2 text-sm',
			md: 'px-5 py-2.5 text-sm',
			lg: 'px-5 py-3 text-base',
			xl: 'px-6 py-3.5 text-base'
		};

		const hasBorder = () => outline || color === 'alternative' || color === 'light';
		let buttonClass;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function change_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function touchstart_handler(event) {
			bubble.call(this, $$self, event);
		}

		function touchend_handler(event) {
			bubble.call(this, $$self, event);
		}

		function touchcancel_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function click_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function change_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function touchstart_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function touchend_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function touchcancel_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(39, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(4, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('pill' in $$new_props) $$invalidate(5, pill = $$new_props.pill);
			if ('outline' in $$new_props) $$invalidate(6, outline = $$new_props.outline);
			if ('size' in $$new_props) $$invalidate(7, size = $$new_props.size);
			if ('href' in $$new_props) $$invalidate(0, href = $$new_props.href);
			if ('type' in $$new_props) $$invalidate(1, type = $$new_props.type);
			if ('color' in $$new_props) $$invalidate(8, color = $$new_props.color);
			if ('shadow' in $$new_props) $$invalidate(9, shadow = $$new_props.shadow);
			if ('tag' in $$new_props) $$invalidate(2, tag = $$new_props.tag);
			if ('checked' in $$new_props) $$invalidate(10, checked = $$new_props.checked);
			if ('$$scope' in $$new_props) $$invalidate(11, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			getContext,
			group,
			pill,
			outline,
			size,
			href,
			type,
			color,
			shadow,
			tag,
			checked,
			colorClasses,
			colorCheckedClasses,
			coloredFocusClasses,
			coloredShadowClasses,
			outlineClasses,
			sizeClasses,
			hasBorder,
			buttonClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(39, $$props = assign(assign({}, $$props), $$new_props));
			if ('pill' in $$props) $$invalidate(5, pill = $$new_props.pill);
			if ('outline' in $$props) $$invalidate(6, outline = $$new_props.outline);
			if ('size' in $$props) $$invalidate(7, size = $$new_props.size);
			if ('href' in $$props) $$invalidate(0, href = $$new_props.href);
			if ('type' in $$props) $$invalidate(1, type = $$new_props.type);
			if ('color' in $$props) $$invalidate(8, color = $$new_props.color);
			if ('shadow' in $$props) $$invalidate(9, shadow = $$new_props.shadow);
			if ('tag' in $$props) $$invalidate(2, tag = $$new_props.tag);
			if ('checked' in $$props) $$invalidate(10, checked = $$new_props.checked);
			if ('buttonClass' in $$props) $$invalidate(3, buttonClass = $$new_props.buttonClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			$$invalidate(3, buttonClass = twMerge(
				'text-center font-medium',
				group ? 'focus-within:ring-2' : 'focus-within:ring-4',
				group && 'focus-within:z-10',
				group || 'focus-within:outline-none',
				'inline-flex items-center justify-center ' + sizeClasses[size],
				outline && checked && 'border dark:border-gray-900',
				outline && checked && colorCheckedClasses[color],
				outline && !checked && outlineClasses[color],
				!outline && checked && colorCheckedClasses[color],
				!outline && !checked && colorClasses[color],
				color === 'alternative' && (group && !checked
				? 'dark:bg-gray-700 dark:text-white dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-600'
				: 'dark:bg-transparent dark:border-gray-600 dark:hover:border-gray-600'),
				outline && color === 'dark' && (group
				? checked
					? 'bg-gray-900 border-gray-800 dark:border-white dark:bg-gray-600'
					: 'dark:text-white border-gray-800 dark:border-white'
				: 'dark:text-gray-400 dark:border-gray-700'),
				coloredFocusClasses[color],
				hasBorder() && group && 'border-s-0 first:border-s',
				group
				? pill && 'first:rounded-s-full last:rounded-e-full' || 'first:rounded-s-lg last:rounded-e-lg'
				: pill && 'rounded-full' || 'rounded-lg',
				shadow && 'shadow-lg',
				shadow && coloredShadowClasses[color],
				$$props.disabled && 'cursor-not-allowed opacity-50',
				$$props.class
			));
		};

		$$props = exclude_internal_props($$props);

		return [
			href,
			type,
			tag,
			buttonClass,
			$$restProps,
			pill,
			outline,
			size,
			color,
			shadow,
			checked,
			$$scope,
			slots,
			click_handler,
			change_handler,
			keydown_handler,
			keyup_handler,
			touchstart_handler,
			touchend_handler,
			touchcancel_handler,
			mouseenter_handler,
			mouseleave_handler,
			click_handler_1,
			change_handler_1,
			keydown_handler_1,
			keyup_handler_1,
			touchstart_handler_1,
			touchend_handler_1,
			touchcancel_handler_1,
			mouseenter_handler_1,
			mouseleave_handler_1
		];
	}

	class Button extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(
				this,
				options,
				instance$n,
				create_fragment$n,
				safe_not_equal,
				{
					pill: 5,
					outline: 6,
					size: 7,
					href: 0,
					type: 1,
					color: 8,
					shadow: 9,
					tag: 2,
					checked: 10
				},
				null,
				[-1, -1]
			);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Button",
				options,
				id: create_fragment$n.name
			});
		}

		get pill() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set pill(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get outline() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set outline(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get size() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set size(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get href() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set href(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get type() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set type(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get shadow() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set shadow(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get tag() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tag(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get checked() {
			throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set checked(value) {
			throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/cards/Card.svelte generated by Svelte v4.2.12 */
	const file$m = "node_modules/flowbite-svelte/dist/cards/Card.svelte";

	// (39:2) {:else}
	function create_else_block$a(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[10].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[16],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$a.name,
			type: "else",
			source: "(39:2) {:else}",
			ctx
		});

		return block;
	}

	// (34:2) {#if img}
	function create_if_block$e(ctx) {
		let img_1;
		let img_1_src_value;
		let t;
		let div;
		let current;
		const default_slot_template = /*#slots*/ ctx[10].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

		const block = {
			c: function create() {
				img_1 = element("img");
				t = space();
				div = element("div");
				if (default_slot) default_slot.c();
				attr_dev(img_1, "class", /*imgClass*/ ctx[4]);
				if (!src_url_equal(img_1.src, img_1_src_value = /*img*/ ctx[1])) attr_dev(img_1, "src", img_1_src_value);
				attr_dev(img_1, "alt", "");
				add_location(img_1, file$m, 34, 4, 1255);
				attr_dev(div, "class", /*innerPadding*/ ctx[2]);
				add_location(div, file$m, 35, 4, 1301);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img_1, anchor);
				insert_dev(target, t, anchor);
				insert_dev(target, div, anchor);

				if (default_slot) {
					default_slot.m(div, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (!current || dirty & /*imgClass*/ 16) {
					attr_dev(img_1, "class", /*imgClass*/ ctx[4]);
				}

				if (!current || dirty & /*img*/ 2 && !src_url_equal(img_1.src, img_1_src_value = /*img*/ ctx[1])) {
					attr_dev(img_1, "src", img_1_src_value);
				}

				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[16],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*innerPadding*/ 4) {
					attr_dev(div, "class", /*innerPadding*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img_1);
					detach_dev(t);
					detach_dev(div);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$e.name,
			type: "if",
			source: "(34:2) {#if img}",
			ctx
		});

		return block;
	}

	// (33:0) <Frame tag={href ? 'a' : 'div'} rounded shadow border on:click on:focusin on:focusout on:mouseenter on:mouseleave {href} {...$$restProps} class={cardClass}>
	function create_default_slot$a(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$e, create_else_block$a];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*img*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$a.name,
			type: "slot",
			source: "(33:0) <Frame tag={href ? 'a' : 'div'} rounded shadow border on:click on:focusin on:focusout on:mouseenter on:mouseleave {href} {...$$restProps} class={cardClass}>",
			ctx
		});

		return block;
	}

	function create_fragment$m(ctx) {
		let frame;
		let current;

		const frame_spread_levels = [
			{ tag: /*href*/ ctx[0] ? 'a' : 'div' },
			{ rounded: true },
			{ shadow: true },
			{ border: true },
			{ href: /*href*/ ctx[0] },
			/*$$restProps*/ ctx[5],
			{ class: /*cardClass*/ ctx[3] }
		];

		let frame_props = {
			$$slots: { default: [create_default_slot$a] },
			$$scope: { ctx }
		};

		for (let i = 0; i < frame_spread_levels.length; i += 1) {
			frame_props = assign(frame_props, frame_spread_levels[i]);
		}

		frame = new Frame({ props: frame_props, $$inline: true });
		frame.$on("click", /*click_handler*/ ctx[11]);
		frame.$on("focusin", /*focusin_handler*/ ctx[12]);
		frame.$on("focusout", /*focusout_handler*/ ctx[13]);
		frame.$on("mouseenter", /*mouseenter_handler*/ ctx[14]);
		frame.$on("mouseleave", /*mouseleave_handler*/ ctx[15]);

		const block = {
			c: function create() {
				create_component(frame.$$.fragment);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(frame, target, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const frame_changes = (dirty & /*href, $$restProps, cardClass*/ 41)
				? get_spread_update(frame_spread_levels, [
						dirty & /*href*/ 1 && { tag: /*href*/ ctx[0] ? 'a' : 'div' },
						frame_spread_levels[1],
						frame_spread_levels[2],
						frame_spread_levels[3],
						dirty & /*href*/ 1 && { href: /*href*/ ctx[0] },
						dirty & /*$$restProps*/ 32 && get_spread_object(/*$$restProps*/ ctx[5]),
						dirty & /*cardClass*/ 8 && { class: /*cardClass*/ ctx[3] }
					])
				: {};

				if (dirty & /*$$scope, innerPadding, imgClass, img*/ 65558) {
					frame_changes.$$scope = { dirty, ctx };
				}

				frame.$set(frame_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(frame.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(frame.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(frame, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$m.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$m($$self, $$props, $$invalidate) {
		const omit_props_names = ["href","horizontal","reverse","img","padding","size"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Card', slots, ['default']);
		let { href = undefined } = $$props;
		let { horizontal = false } = $$props;
		let { reverse = false } = $$props;
		let { img = undefined } = $$props;
		let { padding = 'lg' } = $$props;
		let { size = 'sm' } = $$props;

		const paddings = {
			none: '',
			xs: 'p-2',
			sm: 'p-4',
			md: 'p-4 sm:p-5',
			lg: 'p-4 sm:p-6',
			xl: 'p-4 sm:p-8'
		};

		const sizes = {
			none: '',
			xs: 'max-w-xs',
			sm: 'max-w-sm',
			md: 'max-w-xl',
			lg: 'max-w-2xl',
			xl: 'max-w-screen-xl'
		};

		let innerPadding;
		let cardClass;
		let imgClass;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focusin_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focusout_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(19, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('href' in $$new_props) $$invalidate(0, href = $$new_props.href);
			if ('horizontal' in $$new_props) $$invalidate(6, horizontal = $$new_props.horizontal);
			if ('reverse' in $$new_props) $$invalidate(7, reverse = $$new_props.reverse);
			if ('img' in $$new_props) $$invalidate(1, img = $$new_props.img);
			if ('padding' in $$new_props) $$invalidate(8, padding = $$new_props.padding);
			if ('size' in $$new_props) $$invalidate(9, size = $$new_props.size);
			if ('$$scope' in $$new_props) $$invalidate(16, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			Frame,
			href,
			horizontal,
			reverse,
			img,
			padding,
			size,
			paddings,
			sizes,
			innerPadding,
			cardClass,
			imgClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(19, $$props = assign(assign({}, $$props), $$new_props));
			if ('href' in $$props) $$invalidate(0, href = $$new_props.href);
			if ('horizontal' in $$props) $$invalidate(6, horizontal = $$new_props.horizontal);
			if ('reverse' in $$props) $$invalidate(7, reverse = $$new_props.reverse);
			if ('img' in $$props) $$invalidate(1, img = $$new_props.img);
			if ('padding' in $$props) $$invalidate(8, padding = $$new_props.padding);
			if ('size' in $$props) $$invalidate(9, size = $$new_props.size);
			if ('innerPadding' in $$props) $$invalidate(2, innerPadding = $$new_props.innerPadding);
			if ('cardClass' in $$props) $$invalidate(3, cardClass = $$new_props.cardClass);
			if ('imgClass' in $$props) $$invalidate(4, imgClass = $$new_props.imgClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*padding*/ 256) {
				$$invalidate(2, innerPadding = paddings[padding]);
			}

			$$invalidate(3, cardClass = twMerge('flex w-full', sizes[size], reverse ? 'flex-col-reverse' : 'flex-col', horizontal && (reverse ? 'md:flex-row-reverse' : 'md:flex-row'), href && 'hover:bg-gray-100 dark:hover:bg-gray-700', !img && innerPadding, $$props.class));

			if ($$self.$$.dirty & /*reverse, horizontal*/ 192) {
				$$invalidate(4, imgClass = twMerge(reverse ? 'rounded-b-lg' : 'rounded-t-lg', horizontal && 'object-cover w-full h-96 md:h-auto md:w-48 md:rounded-none', horizontal && (reverse ? 'md:rounded-e-lg' : 'md:rounded-s-lg')));
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			href,
			img,
			innerPadding,
			cardClass,
			imgClass,
			$$restProps,
			horizontal,
			reverse,
			padding,
			size,
			slots,
			click_handler,
			focusin_handler,
			focusout_handler,
			mouseenter_handler,
			mouseleave_handler,
			$$scope
		];
	}

	class Card extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$m, create_fragment$m, safe_not_equal, {
				href: 0,
				horizontal: 6,
				reverse: 7,
				img: 1,
				padding: 8,
				size: 9
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Card",
				options,
				id: create_fragment$m.name
			});
		}

		get href() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set href(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get horizontal() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set horizontal(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get reverse() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set reverse(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get img() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set img(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get padding() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set padding(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get size() {
			throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set size(value) {
			throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/utils/Wrapper.svelte generated by Svelte v4.2.12 */
	const file$l = "node_modules/flowbite-svelte/dist/utils/Wrapper.svelte";

	// (8:0) {:else}
	function create_else_block$9(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[5].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[4],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$9.name,
			type: "else",
			source: "(8:0) {:else}",
			ctx
		});

		return block;
	}

	// (6:0) {#if show}
	function create_if_block$d(ctx) {
		let previous_tag = /*tag*/ ctx[0];
		let svelte_element_anchor;
		let current;
		validate_dynamic_element(/*tag*/ ctx[0]);
		validate_void_dynamic_element(/*tag*/ ctx[0]);
		let svelte_element = /*tag*/ ctx[0] && create_dynamic_element$2(ctx);

		const block = {
			c: function create() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert_dev(target, svelte_element_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*tag*/ ctx[0]) {
					if (!previous_tag) {
						svelte_element = create_dynamic_element$2(ctx);
						previous_tag = /*tag*/ ctx[0];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*tag*/ ctx[0])) {
						svelte_element.d(1);
						validate_dynamic_element(/*tag*/ ctx[0]);
						validate_void_dynamic_element(/*tag*/ ctx[0]);
						svelte_element = create_dynamic_element$2(ctx);
						previous_tag = /*tag*/ ctx[0];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*tag*/ ctx[0];
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(svelte_element, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(svelte_element, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$d.name,
			type: "if",
			source: "(6:0) {#if show}",
			ctx
		});

		return block;
	}

	// (7:2) <svelte:element this={tag} use:use {...$$restProps}>
	function create_dynamic_element$2(ctx) {
		let svelte_element;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[5].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
		let svelte_element_levels = [/*$$restProps*/ ctx[3]];
		let svelte_element_data = {};

		for (let i = 0; i < svelte_element_levels.length; i += 1) {
			svelte_element_data = assign(svelte_element_data, svelte_element_levels[i]);
		}

		const block = {
			c: function create() {
				svelte_element = element(/*tag*/ ctx[0]);
				if (default_slot) default_slot.c();
				set_dynamic_element_data(/*tag*/ ctx[0])(svelte_element, svelte_element_data);
				add_location(svelte_element, file$l, 6, 2, 101);
			},
			m: function mount(target, anchor) {
				insert_dev(target, svelte_element, anchor);

				if (default_slot) {
					default_slot.m(svelte_element, null);
				}

				current = true;

				if (!mounted) {
					dispose = action_destroyer(/*use*/ ctx[2].call(null, svelte_element));
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[4],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
							null
						);
					}
				}

				set_dynamic_element_data(/*tag*/ ctx[0])(svelte_element, svelte_element_data = get_spread_update(svelte_element_levels, [dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3]]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_dynamic_element$2.name,
			type: "child_dynamic_element",
			source: "(7:2) <svelte:element this={tag} use:use {...$$restProps}>",
			ctx
		});

		return block;
	}

	function create_fragment$l(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$d, create_else_block$9];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*show*/ ctx[1]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$l.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$l($$self, $$props, $$invalidate) {
		const omit_props_names = ["tag","show","use"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Wrapper', slots, ['default']);
		let { tag = 'div' } = $$props;
		let { show } = $$props;

		let { use = () => {
			
		} } = $$props;

		$$self.$$.on_mount.push(function () {
			if (show === undefined && !('show' in $$props || $$self.$$.bound[$$self.$$.props['show']])) {
				console.warn("<Wrapper> was created without expected prop 'show'");
			}
		});

		$$self.$$set = $$new_props => {
			$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
			$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('tag' in $$new_props) $$invalidate(0, tag = $$new_props.tag);
			if ('show' in $$new_props) $$invalidate(1, show = $$new_props.show);
			if ('use' in $$new_props) $$invalidate(2, use = $$new_props.use);
			if ('$$scope' in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({ tag, show, use });

		$$self.$inject_state = $$new_props => {
			if ('tag' in $$props) $$invalidate(0, tag = $$new_props.tag);
			if ('show' in $$props) $$invalidate(1, show = $$new_props.show);
			if ('use' in $$props) $$invalidate(2, use = $$new_props.use);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [tag, show, use, $$restProps, $$scope, slots];
	}

	class Wrapper extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$l, create_fragment$l, safe_not_equal, { tag: 0, show: 1, use: 2 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Wrapper",
				options,
				id: create_fragment$l.name
			});
		}

		get tag() {
			throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tag(value) {
			throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get show() {
			throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set show(value) {
			throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get use() {
			throw new Error("<Wrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set use(value) {
			throw new Error("<Wrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/forms/Label.svelte generated by Svelte v4.2.12 */
	const file$k = "node_modules/flowbite-svelte/dist/forms/Label.svelte";

	// (23:0) {:else}
	function create_else_block$8(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[7].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[6],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$8.name,
			type: "else",
			source: "(23:0) {:else}",
			ctx
		});

		return block;
	}

	// (20:0) {#if show}
	function create_if_block$c(ctx) {
		let label;
		let current;
		const default_slot_template = /*#slots*/ ctx[7].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);
		let label_levels = [/*$$restProps*/ ctx[3], { class: /*labelClass*/ ctx[2] }];
		let label_data = {};

		for (let i = 0; i < label_levels.length; i += 1) {
			label_data = assign(label_data, label_levels[i]);
		}

		const block = {
			c: function create() {
				label = element("label");
				if (default_slot) default_slot.c();
				set_attributes(label, label_data);
				add_location(label, file$k, 21, 2, 698);
			},
			m: function mount(target, anchor) {
				insert_dev(target, label, anchor);

				if (default_slot) {
					default_slot.m(label, null);
				}

				/*label_binding*/ ctx[8](label);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[6],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
							null
						);
					}
				}

				set_attributes(label, label_data = get_spread_update(label_levels, [
					dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3],
					(!current || dirty & /*labelClass*/ 4) && { class: /*labelClass*/ ctx[2] }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(label);
				}

				if (default_slot) default_slot.d(detaching);
				/*label_binding*/ ctx[8](null);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$c.name,
			type: "if",
			source: "(20:0) {#if show}",
			ctx
		});

		return block;
	}

	function create_fragment$k(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$c, create_else_block$8];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*show*/ ctx[0]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$k.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$k($$self, $$props, $$invalidate) {
		let labelClass;
		const omit_props_names = ["color","defaultClass","show"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Label', slots, ['default']);
		let { color = 'gray' } = $$props;
		let { defaultClass = 'text-sm rtl:text-right font-medium block' } = $$props;
		let { show = true } = $$props;
		let node;

		const colorClasses = {
			gray: 'text-gray-900 dark:text-gray-300',
			green: 'text-green-700 dark:text-green-500',
			red: 'text-red-700 dark:text-red-500',
			disabled: 'text-gray-400 dark:text-gray-500'
		};

		function label_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				node = $$value;
				$$invalidate(1, node);
			});
		}

		$$self.$$set = $$new_props => {
			$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('color' in $$new_props) $$invalidate(4, color = $$new_props.color);
			if ('defaultClass' in $$new_props) $$invalidate(5, defaultClass = $$new_props.defaultClass);
			if ('show' in $$new_props) $$invalidate(0, show = $$new_props.show);
			if ('$$scope' in $$new_props) $$invalidate(6, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			color,
			defaultClass,
			show,
			node,
			colorClasses,
			labelClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(10, $$props = assign(assign({}, $$props), $$new_props));
			if ('color' in $$props) $$invalidate(4, color = $$new_props.color);
			if ('defaultClass' in $$props) $$invalidate(5, defaultClass = $$new_props.defaultClass);
			if ('show' in $$props) $$invalidate(0, show = $$new_props.show);
			if ('node' in $$props) $$invalidate(1, node = $$new_props.node);
			if ('labelClass' in $$props) $$invalidate(2, labelClass = $$new_props.labelClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*node, color*/ 18) {
				// function checkDisabled(node: HTMLLabelElement) {
				{
					const control = node?.control;
					$$invalidate(4, color = (control?.disabled) ? 'disabled' : color);
				}
			}

			$$invalidate(2, labelClass = twMerge(defaultClass, colorClasses[color], $$props.class));
		};

		$$props = exclude_internal_props($$props);

		return [
			show,
			node,
			labelClass,
			$$restProps,
			color,
			defaultClass,
			$$scope,
			slots,
			label_binding
		];
	}

	class Label extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$k, create_fragment$k, safe_not_equal, { color: 4, defaultClass: 5, show: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Label",
				options,
				id: create_fragment$k.name
			});
		}

		get color() {
			throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get defaultClass() {
			throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set defaultClass(value) {
			throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get show() {
			throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set show(value) {
			throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/forms/Radio.svelte generated by Svelte v4.2.12 */

	const colorClasses = {
		primary: 'text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600',
		secondary: 'text-secondary-600 focus:ring-secondary-500 dark:focus:ring-secondary-600',
		red: 'text-red-600 focus:ring-red-500 dark:focus:ring-red-600',
		green: 'text-green-600 focus:ring-green-500 dark:focus:ring-green-600',
		purple: 'text-purple-600 focus:ring-purple-500 dark:focus:ring-purple-600',
		teal: 'text-teal-600 focus:ring-teal-500 dark:focus:ring-teal-600',
		yellow: 'text-yellow-400 focus:ring-yellow-500 dark:focus:ring-yellow-600',
		orange: 'text-orange-500 focus:ring-orange-500 dark:focus:ring-orange-600',
		blue: 'text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600'
	};

	const labelClass = (inline, extraClass) => twMerge(inline ? 'inline-flex' : 'flex', 'items-center', extraClass);

	const inputClass = (custom, color, rounded, tinted, spacing, extraClass) => twMerge(
		'w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2',
		spacing,
		tinted
		? 'dark:bg-gray-600 dark:border-gray-500'
		: 'dark:bg-gray-700 dark:border-gray-600',
		custom && 'sr-only peer',
		rounded && 'rounded',
		colorClasses[color],
		extraClass
	);

	/* node_modules/flowbite-svelte/dist/forms/Checkbox.svelte generated by Svelte v4.2.12 */
	const file$j = "node_modules/flowbite-svelte/dist/forms/Checkbox.svelte";

	// (48:0) <Label class={labelClass(inline, $$props.class)} show={$$slots.default}>
	function create_default_slot$9(ctx) {
		let input;
		let input_class_value;
		let init_action;
		let t;
		let current;
		let mounted;
		let dispose;

		let input_levels = [
			{ type: "checkbox" },
			{ __value: /*value*/ ctx[5] },
			/*$$restProps*/ ctx[12],
			{
				class: input_class_value = inputClass(/*custom*/ ctx[3], /*color*/ ctx[2], true, /*background*/ ctx[7], /*spacing*/ ctx[6], /*$$slots*/ ctx[11].default || /*$$props*/ ctx[10].class)
			}
		];

		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		const default_slot_template = /*#slots*/ ctx[13].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[26], null);

		const block = {
			c: function create() {
				input = element("input");
				t = space();
				if (default_slot) default_slot.c();
				set_attributes(input, input_data);
				add_location(input, file$j, 48, 2, 1396);
			},
			m: function mount(target, anchor) {
				insert_dev(target, input, anchor);
				if (input.autofocus) input.focus();
				input.checked = /*checked*/ ctx[1];
				insert_dev(target, t, anchor);

				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;

				if (!mounted) {
					dispose = [
						action_destroyer(init_action = /*init*/ ctx[8].call(null, input, /*group*/ ctx[0])),
						listen_dev(input, "change", /*input_change_handler*/ ctx[25]),
						listen_dev(input, "keyup", /*keyup_handler*/ ctx[14], false, false, false, false),
						listen_dev(input, "keydown", /*keydown_handler*/ ctx[15], false, false, false, false),
						listen_dev(input, "keypress", /*keypress_handler*/ ctx[16], false, false, false, false),
						listen_dev(input, "focus", /*focus_handler*/ ctx[17], false, false, false, false),
						listen_dev(input, "blur", /*blur_handler*/ ctx[18], false, false, false, false),
						listen_dev(input, "click", /*click_handler*/ ctx[19], false, false, false, false),
						listen_dev(input, "mouseover", /*mouseover_handler*/ ctx[20], false, false, false, false),
						listen_dev(input, "mouseenter", /*mouseenter_handler*/ ctx[21], false, false, false, false),
						listen_dev(input, "mouseleave", /*mouseleave_handler*/ ctx[22], false, false, false, false),
						listen_dev(input, "paste", /*paste_handler*/ ctx[23], false, false, false, false),
						listen_dev(input, "change", /*onChange*/ ctx[9], false, false, false, false),
						listen_dev(input, "change", /*change_handler*/ ctx[24], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				set_attributes(input, input_data = get_spread_update(input_levels, [
					{ type: "checkbox" },
					(!current || dirty & /*value*/ 32) && { __value: /*value*/ ctx[5] },
					dirty & /*$$restProps*/ 4096 && /*$$restProps*/ ctx[12],
					(!current || dirty & /*custom, color, spacing, $$slots, $$props*/ 3148 && input_class_value !== (input_class_value = inputClass(/*custom*/ ctx[3], /*color*/ ctx[2], true, /*background*/ ctx[7], /*spacing*/ ctx[6], /*$$slots*/ ctx[11].default || /*$$props*/ ctx[10].class))) && { class: input_class_value }
				]));

				if (init_action && is_function(init_action.update) && dirty & /*group*/ 1) init_action.update.call(null, /*group*/ ctx[0]);

				if (dirty & /*checked*/ 2) {
					input.checked = /*checked*/ ctx[1];
				}

				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 67108864)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[26], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(input);
					detach_dev(t);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$9.name,
			type: "slot",
			source: "(48:0) <Label class={labelClass(inline, $$props.class)} show={$$slots.default}>",
			ctx
		});

		return block;
	}

	function create_fragment$j(ctx) {
		let label;
		let current;

		label = new Label({
				props: {
					class: labelClass(/*inline*/ ctx[4], /*$$props*/ ctx[10].class),
					show: /*$$slots*/ ctx[11].default,
					$$slots: { default: [create_default_slot$9] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(label.$$.fragment);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(label, target, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const label_changes = {};
				if (dirty & /*inline, $$props*/ 1040) label_changes.class = labelClass(/*inline*/ ctx[4], /*$$props*/ ctx[10].class);
				if (dirty & /*$$slots*/ 2048) label_changes.show = /*$$slots*/ ctx[11].default;

				if (dirty & /*$$scope, value, $$restProps, custom, color, spacing, $$slots, $$props, checked, group*/ 67116143) {
					label_changes.$$scope = { dirty, ctx };
				}

				label.$set(label_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(label.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(label, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$j.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$j($$self, $$props, $$invalidate) {
		const omit_props_names = ["color","custom","inline","group","value","checked","spacing"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Checkbox', slots, ['default']);
		const $$slots = compute_slots(slots);
		let { color = 'primary' } = $$props;
		let { custom = false } = $$props;
		let { inline = false } = $$props;
		let { group = [] } = $$props;
		let { value = 'on' } = $$props;
		let { checked = undefined } = $$props;
		let { spacing = 'me-2' } = $$props;

		// tinted if put in component having its own background
		let background = getContext('background');

		// react on external group changes
		function init(_, _group) {
			if (checked === undefined) $$invalidate(1, checked = _group.includes(value));
			onChange();

			return {
				update(_group) {
					$$invalidate(1, checked = _group.includes(value));
				}
			};
		}

		function onChange() {
			// There's a bug in Svelte and bind:group is not working with wrapped checkbox
			// This workaround is taken from:
			// https://svelte.dev/repl/de117399559f4e7e9e14e2fc9ab243cc?version=3.12.1
			const index = group.indexOf(value);

			if (checked === undefined) $$invalidate(1, checked = index >= 0);

			if (checked) {
				if (index < 0) {
					group.push(value);
					$$invalidate(0, group);
				}
			} else {
				if (index >= 0) {
					group.splice(index, 1);
					$$invalidate(0, group);
				}
			}
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keypress_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focus_handler(event) {
			bubble.call(this, $$self, event);
		}

		function blur_handler(event) {
			bubble.call(this, $$self, event);
		}

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseover_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function paste_handler(event) {
			bubble.call(this, $$self, event);
		}

		function change_handler(event) {
			bubble.call(this, $$self, event);
		}

		function input_change_handler() {
			checked = this.checked;
			$$invalidate(1, checked);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(12, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('color' in $$new_props) $$invalidate(2, color = $$new_props.color);
			if ('custom' in $$new_props) $$invalidate(3, custom = $$new_props.custom);
			if ('inline' in $$new_props) $$invalidate(4, inline = $$new_props.inline);
			if ('group' in $$new_props) $$invalidate(0, group = $$new_props.group);
			if ('value' in $$new_props) $$invalidate(5, value = $$new_props.value);
			if ('checked' in $$new_props) $$invalidate(1, checked = $$new_props.checked);
			if ('spacing' in $$new_props) $$invalidate(6, spacing = $$new_props.spacing);
			if ('$$scope' in $$new_props) $$invalidate(26, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			getContext,
			labelClass,
			inputClass,
			Label,
			color,
			custom,
			inline,
			group,
			value,
			checked,
			spacing,
			background,
			init,
			onChange
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(10, $$props = assign(assign({}, $$props), $$new_props));
			if ('color' in $$props) $$invalidate(2, color = $$new_props.color);
			if ('custom' in $$props) $$invalidate(3, custom = $$new_props.custom);
			if ('inline' in $$props) $$invalidate(4, inline = $$new_props.inline);
			if ('group' in $$props) $$invalidate(0, group = $$new_props.group);
			if ('value' in $$props) $$invalidate(5, value = $$new_props.value);
			if ('checked' in $$props) $$invalidate(1, checked = $$new_props.checked);
			if ('spacing' in $$props) $$invalidate(6, spacing = $$new_props.spacing);
			if ('background' in $$props) $$invalidate(7, background = $$new_props.background);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$props = exclude_internal_props($$props);

		return [
			group,
			checked,
			color,
			custom,
			inline,
			value,
			spacing,
			background,
			init,
			onChange,
			$$props,
			$$slots,
			$$restProps,
			slots,
			keyup_handler,
			keydown_handler,
			keypress_handler,
			focus_handler,
			blur_handler,
			click_handler,
			mouseover_handler,
			mouseenter_handler,
			mouseleave_handler,
			paste_handler,
			change_handler,
			input_change_handler,
			$$scope
		];
	}

	class Checkbox extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$j, create_fragment$j, safe_not_equal, {
				color: 2,
				custom: 3,
				inline: 4,
				group: 0,
				value: 5,
				checked: 1,
				spacing: 6
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Checkbox",
				options,
				id: create_fragment$j.name
			});
		}

		get color() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get custom() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set custom(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get inline() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set inline(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get group() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set group(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get value() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set value(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get checked() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set checked(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get spacing() {
			throw new Error("<Checkbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set spacing(value) {
			throw new Error("<Checkbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/forms/Input.svelte generated by Svelte v4.2.12 */
	const file$i = "node_modules/flowbite-svelte/dist/forms/Input.svelte";
	const get_right_slot_changes = dirty => ({});
	const get_right_slot_context = ctx => ({});

	const get_default_slot_changes$1 = dirty => ({
		props: dirty[0] & /*$$restProps, inputClass*/ 72
	});

	const get_default_slot_context$1 = ctx => ({
		props: {
			.../*$$restProps*/ ctx[6],
			class: /*inputClass*/ ctx[3]
		}
	});

	const get_left_slot_changes = dirty => ({});
	const get_left_slot_context = ctx => ({});

	// (48:2) {#if $$slots.left}
	function create_if_block_1$8(ctx) {
		let div;
		let div_class_value;
		let current;
		const left_slot_template = /*#slots*/ ctx[11].left;
		const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[26], get_left_slot_context);

		const block = {
			c: function create() {
				div = element("div");
				if (left_slot) left_slot.c();
				attr_dev(div, "class", div_class_value = "" + (twMerge(/*floatClass*/ ctx[2], /*$$props*/ ctx[4].classLeft) + " start-0 ps-2.5 pointer-events-none"));
				add_location(div, file$i, 48, 4, 2632);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (left_slot) {
					left_slot.m(div, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (left_slot) {
					if (left_slot.p && (!current || dirty[0] & /*$$scope*/ 67108864)) {
						update_slot_base(
							left_slot,
							left_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(left_slot_template, /*$$scope*/ ctx[26], dirty, get_left_slot_changes),
							get_left_slot_context
						);
					}
				}

				if (!current || dirty[0] & /*floatClass, $$props*/ 20 && div_class_value !== (div_class_value = "" + (twMerge(/*floatClass*/ ctx[2], /*$$props*/ ctx[4].classLeft) + " start-0 ps-2.5 pointer-events-none"))) {
					attr_dev(div, "class", div_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(left_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(left_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (left_slot) left_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$8.name,
			type: "if",
			source: "(48:2) {#if $$slots.left}",
			ctx
		});

		return block;
	}

	// (53:54)      
	function fallback_block$2(ctx) {
		let input;
		let mounted;
		let dispose;

		let input_levels = [
			/*$$restProps*/ ctx[6],
			{ type: /*type*/ ctx[1] },
			{ class: /*inputClass*/ ctx[3] }
		];

		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		const block = {
			c: function create() {
				input = element("input");
				set_attributes(input, input_data);
				add_location(input, file$i, 53, 4, 2827);
			},
			m: function mount(target, anchor) {
				insert_dev(target, input, anchor);
				if (input.autofocus) input.focus();
				set_input_value(input, /*value*/ ctx[0]);

				if (!mounted) {
					dispose = [
						listen_dev(input, "input", /*input_input_handler*/ ctx[25]),
						listen_dev(input, "blur", /*blur_handler*/ ctx[12], false, false, false, false),
						listen_dev(input, "change", /*change_handler*/ ctx[13], false, false, false, false),
						listen_dev(input, "click", /*click_handler*/ ctx[14], false, false, false, false),
						listen_dev(input, "contextmenu", /*contextmenu_handler*/ ctx[15], false, false, false, false),
						listen_dev(input, "focus", /*focus_handler*/ ctx[16], false, false, false, false),
						listen_dev(input, "keydown", /*keydown_handler*/ ctx[17], false, false, false, false),
						listen_dev(input, "keypress", /*keypress_handler*/ ctx[18], false, false, false, false),
						listen_dev(input, "keyup", /*keyup_handler*/ ctx[19], false, false, false, false),
						listen_dev(input, "mouseover", /*mouseover_handler*/ ctx[20], false, false, false, false),
						listen_dev(input, "mouseenter", /*mouseenter_handler*/ ctx[21], false, false, false, false),
						listen_dev(input, "mouseleave", /*mouseleave_handler*/ ctx[22], false, false, false, false),
						listen_dev(input, "paste", /*paste_handler*/ ctx[23], false, false, false, false),
						listen_dev(input, "input", /*input_handler*/ ctx[24], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				set_attributes(input, input_data = get_spread_update(input_levels, [
					dirty[0] & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6],
					dirty[0] & /*type*/ 2 && { type: /*type*/ ctx[1] },
					dirty[0] & /*inputClass*/ 8 && { class: /*inputClass*/ ctx[3] }
				]));

				if (dirty[0] & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
					set_input_value(input, /*value*/ ctx[0]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(input);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: fallback_block$2.name,
			type: "fallback",
			source: "(53:54)      ",
			ctx
		});

		return block;
	}

	// (56:2) {#if $$slots.right}
	function create_if_block$b(ctx) {
		let div;
		let div_class_value;
		let current;
		const right_slot_template = /*#slots*/ ctx[11].right;
		const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[26], get_right_slot_context);

		const block = {
			c: function create() {
				div = element("div");
				if (right_slot) right_slot.c();
				attr_dev(div, "class", div_class_value = "" + (twMerge(/*floatClass*/ ctx[2], /*$$props*/ ctx[4].classRight) + " end-0 pe-2.5"));
				add_location(div, file$i, 56, 4, 3076);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (right_slot) {
					right_slot.m(div, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (right_slot) {
					if (right_slot.p && (!current || dirty[0] & /*$$scope*/ 67108864)) {
						update_slot_base(
							right_slot,
							right_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(right_slot_template, /*$$scope*/ ctx[26], dirty, get_right_slot_changes),
							get_right_slot_context
						);
					}
				}

				if (!current || dirty[0] & /*floatClass, $$props*/ 20 && div_class_value !== (div_class_value = "" + (twMerge(/*floatClass*/ ctx[2], /*$$props*/ ctx[4].classRight) + " end-0 pe-2.5"))) {
					attr_dev(div, "class", div_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(right_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(right_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (right_slot) right_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$b.name,
			type: "if",
			source: "(56:2) {#if $$slots.right}",
			ctx
		});

		return block;
	}

	// (47:0) <Wrapper class="relative w-full" show={$$slots.left || $$slots.right}>
	function create_default_slot$8(ctx) {
		let t0;
		let t1;
		let if_block1_anchor;
		let current;
		let if_block0 = /*$$slots*/ ctx[5].left && create_if_block_1$8(ctx);
		const default_slot_template = /*#slots*/ ctx[11].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[26], get_default_slot_context$1);
		const default_slot_or_fallback = default_slot || fallback_block$2(ctx);
		let if_block1 = /*$$slots*/ ctx[5].right && create_if_block$b(ctx);

		const block = {
			c: function create() {
				if (if_block0) if_block0.c();
				t0 = space();
				if (default_slot_or_fallback) default_slot_or_fallback.c();
				t1 = space();
				if (if_block1) if_block1.c();
				if_block1_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block0) if_block0.m(target, anchor);
				insert_dev(target, t0, anchor);

				if (default_slot_or_fallback) {
					default_slot_or_fallback.m(target, anchor);
				}

				insert_dev(target, t1, anchor);
				if (if_block1) if_block1.m(target, anchor);
				insert_dev(target, if_block1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*$$slots*/ ctx[5].left) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty[0] & /*$$slots*/ 32) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1$8(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(t0.parentNode, t0);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (default_slot) {
					if (default_slot.p && (!current || dirty[0] & /*$$scope, $$restProps, inputClass*/ 67108936)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[26], dirty, get_default_slot_changes$1),
							get_default_slot_context$1
						);
					}
				} else {
					if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*$$restProps, type, inputClass, value*/ 75)) {
						default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
					}
				}

				if (/*$$slots*/ ctx[5].right) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty[0] & /*$$slots*/ 32) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$b(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(default_slot_or_fallback, local);
				transition_in(if_block1);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block0);
				transition_out(default_slot_or_fallback, local);
				transition_out(if_block1);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(if_block1_anchor);
				}

				if (if_block0) if_block0.d(detaching);
				if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
				if (if_block1) if_block1.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$8.name,
			type: "slot",
			source: "(47:0) <Wrapper class=\\\"relative w-full\\\" show={$$slots.left || $$slots.right}>",
			ctx
		});

		return block;
	}

	function create_fragment$i(ctx) {
		let wrapper;
		let current;

		wrapper = new Wrapper({
				props: {
					class: "relative w-full",
					show: /*$$slots*/ ctx[5].left || /*$$slots*/ ctx[5].right,
					$$slots: { default: [create_default_slot$8] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(wrapper.$$.fragment);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(wrapper, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const wrapper_changes = {};
				if (dirty[0] & /*$$slots*/ 32) wrapper_changes.show = /*$$slots*/ ctx[5].left || /*$$slots*/ ctx[5].right;

				if (dirty[0] & /*$$scope, floatClass, $$props, $$slots, $$restProps, type, inputClass, value*/ 67108991) {
					wrapper_changes.$$scope = { dirty, ctx };
				}

				wrapper.$set(wrapper_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(wrapper.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(wrapper.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(wrapper, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$i.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function clampSize(s) {
		return s && s === 'xs' ? 'sm' : s === 'xl' ? 'lg' : s;
	}

	function instance$i($$self, $$props, $$invalidate) {
		let _size;
		const omit_props_names = ["type","value","size","defaultClass","color","floatClass"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Input', slots, ['left','default','right']);
		const $$slots = compute_slots(slots);
		let { type = 'text' } = $$props;
		let { value = undefined } = $$props;
		let { size = undefined } = $$props;
		let { defaultClass = 'block w-full disabled:cursor-not-allowed disabled:opacity-50 rtl:text-right' } = $$props;
		let { color = 'base' } = $$props;
		let { floatClass = 'flex absolute inset-y-0 items-center text-gray-500 dark:text-gray-400' } = $$props;

		const borderClasses = {
			base: 'border-gray-300 dark:border-gray-600',
			tinted: 'border-gray-300 dark:border-gray-500',
			green: 'border-green-500 dark:border-green-400',
			red: 'border-red-500 dark:border-red-400'
		};

		const ringClasses = {
			base: 'focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-500 dark:focus:ring-primary-500',
			green: 'focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500 dark:focus:ring-green-500',
			red: 'focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500'
		};

		const colorClasses = {
			base: 'bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
			tinted: 'bg-gray-50 text-gray-900 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400',
			green: 'bg-green-50 text-green-900 placeholder-green-700 dark:text-green-400 dark:placeholder-green-500 dark:bg-gray-700',
			red: 'bg-red-50 text-red-900 placeholder-red-700 dark:text-red-500 dark:placeholder-red-500 dark:bg-gray-700'
		};

		// tinted if put in component having its own background
		let background = getContext('background');

		let group = getContext('group');

		const textSizes = {
			sm: 'sm:text-xs',
			md: 'text-sm',
			lg: 'sm:text-base'
		};

		const leftPadding = { sm: 'ps-9', md: 'ps-10', lg: 'ps-11' };
		const rightPadding = { sm: 'pe-9', md: 'pe-10', lg: 'pe-11' };
		const inputPadding = { sm: 'p-2', md: 'p-2.5', lg: 'p-3' };
		let inputClass;

		function blur_handler(event) {
			bubble.call(this, $$self, event);
		}

		function change_handler(event) {
			bubble.call(this, $$self, event);
		}

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function contextmenu_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focus_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keypress_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseover_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function paste_handler(event) {
			bubble.call(this, $$self, event);
		}

		function input_handler(event) {
			bubble.call(this, $$self, event);
		}

		function input_input_handler() {
			value = this.value;
			$$invalidate(0, value);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('type' in $$new_props) $$invalidate(1, type = $$new_props.type);
			if ('value' in $$new_props) $$invalidate(0, value = $$new_props.value);
			if ('size' in $$new_props) $$invalidate(7, size = $$new_props.size);
			if ('defaultClass' in $$new_props) $$invalidate(8, defaultClass = $$new_props.defaultClass);
			if ('color' in $$new_props) $$invalidate(9, color = $$new_props.color);
			if ('floatClass' in $$new_props) $$invalidate(2, floatClass = $$new_props.floatClass);
			if ('$$scope' in $$new_props) $$invalidate(26, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			clampSize,
			Wrapper,
			twMerge,
			getContext,
			type,
			value,
			size,
			defaultClass,
			color,
			floatClass,
			borderClasses,
			ringClasses,
			colorClasses,
			background,
			group,
			textSizes,
			leftPadding,
			rightPadding,
			inputPadding,
			inputClass,
			_size
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), $$new_props));
			if ('type' in $$props) $$invalidate(1, type = $$new_props.type);
			if ('value' in $$props) $$invalidate(0, value = $$new_props.value);
			if ('size' in $$props) $$invalidate(7, size = $$new_props.size);
			if ('defaultClass' in $$props) $$invalidate(8, defaultClass = $$new_props.defaultClass);
			if ('color' in $$props) $$invalidate(9, color = $$new_props.color);
			if ('floatClass' in $$props) $$invalidate(2, floatClass = $$new_props.floatClass);
			if ('background' in $$props) $$invalidate(30, background = $$new_props.background);
			if ('group' in $$props) $$invalidate(31, group = $$new_props.group);
			if ('inputClass' in $$props) $$invalidate(3, inputClass = $$new_props.inputClass);
			if ('_size' in $$props) $$invalidate(10, _size = $$new_props._size);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*size*/ 128) {
				$$invalidate(10, _size = size || clampSize(group?.size) || 'md');
			}

			{
				const _color = color === 'base' && background ? 'tinted' : color;

				$$invalidate(3, inputClass = twMerge([
					defaultClass,
					inputPadding[_size],
					$$slots.left && leftPadding[_size] || $$slots.right && rightPadding[_size],
					ringClasses[color],
					colorClasses[_color],
					borderClasses[_color],
					textSizes[_size],
					group || 'rounded-lg',
					group && 'first:rounded-s-lg last:rounded-e-lg',
					group && 'border-s-0 first:border-s last:border-e',
					$$props.class
				]));
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			value,
			type,
			floatClass,
			inputClass,
			$$props,
			$$slots,
			$$restProps,
			size,
			defaultClass,
			color,
			_size,
			slots,
			blur_handler,
			change_handler,
			click_handler,
			contextmenu_handler,
			focus_handler,
			keydown_handler,
			keypress_handler,
			keyup_handler,
			mouseover_handler,
			mouseenter_handler,
			mouseleave_handler,
			paste_handler,
			input_handler,
			input_input_handler,
			$$scope
		];
	}

	class Input extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(
				this,
				options,
				instance$i,
				create_fragment$i,
				safe_not_equal,
				{
					type: 1,
					value: 0,
					size: 7,
					defaultClass: 8,
					color: 9,
					floatClass: 2
				},
				null,
				[-1, -1]
			);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Input",
				options,
				id: create_fragment$i.name
			});
		}

		get type() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set type(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get value() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set value(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get size() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set size(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get defaultClass() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set defaultClass(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get floatClass() {
			throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set floatClass(value) {
			throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/forms/Helper.svelte generated by Svelte v4.2.12 */
	const file$h = "node_modules/flowbite-svelte/dist/forms/Helper.svelte";

	function create_fragment$h(ctx) {
		let p;
		let p_class_value;
		let current;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

		let p_levels = [
			/*$$restProps*/ ctx[3],
			{
				class: p_class_value = twMerge(/*helperClass*/ ctx[0], /*colorClasses*/ ctx[2][/*color*/ ctx[1]], /*$$props*/ ctx[4].class)
			}
		];

		let p_data = {};

		for (let i = 0; i < p_levels.length; i += 1) {
			p_data = assign(p_data, p_levels[i]);
		}

		const block = {
			c: function create() {
				p = element("p");
				if (default_slot) default_slot.c();
				set_attributes(p, p_data);
				add_location(p, file$h, 11, 0, 382);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, p, anchor);

				if (default_slot) {
					default_slot.m(p, null);
				}

				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[5],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
							null
						);
					}
				}

				set_attributes(p, p_data = get_spread_update(p_levels, [
					dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3],
					(!current || dirty & /*helperClass, color, $$props*/ 19 && p_class_value !== (p_class_value = twMerge(/*helperClass*/ ctx[0], /*colorClasses*/ ctx[2][/*color*/ ctx[1]], /*$$props*/ ctx[4].class))) && { class: p_class_value }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(p);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$h.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$h($$self, $$props, $$invalidate) {
		const omit_props_names = ["helperClass","color"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Helper', slots, ['default']);
		let { helperClass = 'text-xs font-normal text-gray-500 dark:text-gray-300' } = $$props;
		let { color = 'gray' } = $$props;

		const colorClasses = {
			gray: 'text-gray-900 dark:text-gray-300',
			green: 'text-green-700 dark:text-green-500',
			red: 'text-red-700 dark:text-red-500',
			disabled: 'text-gray-400 dark:text-gray-500'
		};

		$$self.$$set = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('helperClass' in $$new_props) $$invalidate(0, helperClass = $$new_props.helperClass);
			if ('color' in $$new_props) $$invalidate(1, color = $$new_props.color);
			if ('$$scope' in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			helperClass,
			color,
			colorClasses
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), $$new_props));
			if ('helperClass' in $$props) $$invalidate(0, helperClass = $$new_props.helperClass);
			if ('color' in $$props) $$invalidate(1, color = $$new_props.color);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$props = exclude_internal_props($$props);
		return [helperClass, color, colorClasses, $$restProps, $$props, $$scope, slots];
	}

	class Helper extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$h, create_fragment$h, safe_not_equal, { helperClass: 0, color: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Helper",
				options,
				id: create_fragment$h.name
			});
		}

		get helperClass() {
			throw new Error("<Helper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set helperClass(value) {
			throw new Error("<Helper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Helper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Helper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/Table.svelte generated by Svelte v4.2.12 */
	const file$g = "node_modules/flowbite-svelte/dist/table/Table.svelte";

	function create_fragment$g(ctx) {
		let div;
		let table;
		let table_class_value;
		let div_class_value;
		let current;
		const default_slot_template = /*#slots*/ ctx[11].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

		let table_levels = [
			/*$$restProps*/ ctx[4],
			{
				class: table_class_value = twMerge('w-full text-left text-sm', /*colors*/ ctx[3][/*color*/ ctx[2]], /*$$props*/ ctx[5].class)
			}
		];

		let table_data = {};

		for (let i = 0; i < table_levels.length; i += 1) {
			table_data = assign(table_data, table_levels[i]);
		}

		const block = {
			c: function create() {
				div = element("div");
				table = element("table");
				if (default_slot) default_slot.c();
				set_attributes(table, table_data);
				add_location(table, file$g, 27, 2, 976);
				attr_dev(div, "class", div_class_value = twJoin(/*divClass*/ ctx[0], /*shadow*/ ctx[1] && 'shadow-md sm:rounded-lg'));
				add_location(div, file$g, 26, 0, 906);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, table);

				if (default_slot) {
					default_slot.m(table, null);
				}

				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[10],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
							null
						);
					}
				}

				set_attributes(table, table_data = get_spread_update(table_levels, [
					dirty & /*$$restProps*/ 16 && /*$$restProps*/ ctx[4],
					(!current || dirty & /*color, $$props*/ 36 && table_class_value !== (table_class_value = twMerge('w-full text-left text-sm', /*colors*/ ctx[3][/*color*/ ctx[2]], /*$$props*/ ctx[5].class))) && { class: table_class_value }
				]));

				if (!current || dirty & /*divClass, shadow*/ 3 && div_class_value !== (div_class_value = twJoin(/*divClass*/ ctx[0], /*shadow*/ ctx[1] && 'shadow-md sm:rounded-lg'))) {
					attr_dev(div, "class", div_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$g.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$g($$self, $$props, $$invalidate) {
		const omit_props_names = ["divClass","striped","hoverable","noborder","shadow","color","customeColor"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Table', slots, ['default']);
		let { divClass = 'relative overflow-x-auto' } = $$props;
		let { striped = false } = $$props;
		let { hoverable = false } = $$props;
		let { noborder = false } = $$props;
		let { shadow = false } = $$props;
		let { color = 'default' } = $$props;
		let { customeColor = '' } = $$props;

		const colors = {
			default: 'text-gray-500 dark:text-gray-400',
			blue: 'text-blue-100 dark:text-blue-100',
			green: 'text-green-100 dark:text-green-100',
			red: 'text-red-100 dark:text-red-100',
			yellow: 'text-yellow-100 dark:text-yellow-100',
			purple: 'text-purple-100 dark:text-purple-100',
			indigo: 'text-indigo-100 dark:text-indigo-100',
			pink: 'text-pink-100 dark:text-pink-100',
			custom: customeColor
		};

		$$self.$$set = $$new_props => {
			$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(4, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('divClass' in $$new_props) $$invalidate(0, divClass = $$new_props.divClass);
			if ('striped' in $$new_props) $$invalidate(6, striped = $$new_props.striped);
			if ('hoverable' in $$new_props) $$invalidate(7, hoverable = $$new_props.hoverable);
			if ('noborder' in $$new_props) $$invalidate(8, noborder = $$new_props.noborder);
			if ('shadow' in $$new_props) $$invalidate(1, shadow = $$new_props.shadow);
			if ('color' in $$new_props) $$invalidate(2, color = $$new_props.color);
			if ('customeColor' in $$new_props) $$invalidate(9, customeColor = $$new_props.customeColor);
			if ('$$scope' in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			twJoin,
			setContext,
			divClass,
			striped,
			hoverable,
			noborder,
			shadow,
			color,
			customeColor,
			colors
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(5, $$props = assign(assign({}, $$props), $$new_props));
			if ('divClass' in $$props) $$invalidate(0, divClass = $$new_props.divClass);
			if ('striped' in $$props) $$invalidate(6, striped = $$new_props.striped);
			if ('hoverable' in $$props) $$invalidate(7, hoverable = $$new_props.hoverable);
			if ('noborder' in $$props) $$invalidate(8, noborder = $$new_props.noborder);
			if ('shadow' in $$props) $$invalidate(1, shadow = $$new_props.shadow);
			if ('color' in $$props) $$invalidate(2, color = $$new_props.color);
			if ('customeColor' in $$props) $$invalidate(9, customeColor = $$new_props.customeColor);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*striped*/ 64) {
				setContext('striped', striped);
			}

			if ($$self.$$.dirty & /*hoverable*/ 128) {
				setContext('hoverable', hoverable);
			}

			if ($$self.$$.dirty & /*noborder*/ 256) {
				setContext('noborder', noborder);
			}

			if ($$self.$$.dirty & /*color*/ 4) {
				setContext('color', color);
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			divClass,
			shadow,
			color,
			colors,
			$$restProps,
			$$props,
			striped,
			hoverable,
			noborder,
			customeColor,
			$$scope,
			slots
		];
	}

	class Table extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$g, create_fragment$g, safe_not_equal, {
				divClass: 0,
				striped: 6,
				hoverable: 7,
				noborder: 8,
				shadow: 1,
				color: 2,
				customeColor: 9
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Table",
				options,
				id: create_fragment$g.name
			});
		}

		get divClass() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set divClass(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get striped() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set striped(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get hoverable() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set hoverable(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get noborder() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set noborder(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get shadow() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set shadow(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get customeColor() {
			throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set customeColor(value) {
			throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/TableBody.svelte generated by Svelte v4.2.12 */
	const file$f = "node_modules/flowbite-svelte/dist/table/TableBody.svelte";

	function create_fragment$f(ctx) {
		let tbody;
		let current;
		const default_slot_template = /*#slots*/ ctx[2].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

		const block = {
			c: function create() {
				tbody = element("tbody");
				if (default_slot) default_slot.c();
				attr_dev(tbody, "class", /*tableBodyClass*/ ctx[0]);
				add_location(tbody, file$f, 3, 0, 58);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, tbody, anchor);

				if (default_slot) {
					default_slot.m(tbody, null);
				}

				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[1],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
							null
						);
					}
				}

				if (!current || dirty & /*tableBodyClass*/ 1) {
					attr_dev(tbody, "class", /*tableBodyClass*/ ctx[0]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(tbody);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$f.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$f($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TableBody', slots, ['default']);
		let { tableBodyClass = undefined } = $$props;
		const writable_props = ['tableBodyClass'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TableBody> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('tableBodyClass' in $$props) $$invalidate(0, tableBodyClass = $$props.tableBodyClass);
			if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
		};

		$$self.$capture_state = () => ({ tableBodyClass });

		$$self.$inject_state = $$props => {
			if ('tableBodyClass' in $$props) $$invalidate(0, tableBodyClass = $$props.tableBodyClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [tableBodyClass, $$scope, slots];
	}

	class TableBody extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$f, create_fragment$f, safe_not_equal, { tableBodyClass: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TableBody",
				options,
				id: create_fragment$f.name
			});
		}

		get tableBodyClass() {
			throw new Error("<TableBody>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tableBodyClass(value) {
			throw new Error("<TableBody>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/TableBodyCell.svelte generated by Svelte v4.2.12 */
	const file$e = "node_modules/flowbite-svelte/dist/table/TableBodyCell.svelte";

	// (10:0) <svelte:element this={$$props.onclick ? 'button' : 'td'} {...$$restProps} class={tdClassfinal} on:click role={$$props.onclick ? 'button' : undefined}>
	function create_dynamic_element$1(ctx) {
		let svelte_element;
		let svelte_element_role_value;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

		let svelte_element_levels = [
			/*$$restProps*/ ctx[2],
			{ class: /*tdClassfinal*/ ctx[0] },
			{
				role: svelte_element_role_value = /*$$props*/ ctx[1].onclick ? 'button' : undefined
			}
		];

		let svelte_element_data = {};

		for (let i = 0; i < svelte_element_levels.length; i += 1) {
			svelte_element_data = assign(svelte_element_data, svelte_element_levels[i]);
		}

		const block = {
			c: function create() {
				svelte_element = element(/*$$props*/ ctx[1].onclick ? 'button' : 'td');
				if (default_slot) default_slot.c();
				set_dynamic_element_data(/*$$props*/ ctx[1].onclick ? 'button' : 'td')(svelte_element, svelte_element_data);
				add_location(svelte_element, file$e, 9, 0, 393);
			},
			m: function mount(target, anchor) {
				insert_dev(target, svelte_element, anchor);

				if (default_slot) {
					default_slot.m(svelte_element, null);
				}

				current = true;

				if (!mounted) {
					dispose = listen_dev(svelte_element, "click", /*click_handler*/ ctx[7], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[5],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
							null
						);
					}
				}

				set_dynamic_element_data(/*$$props*/ ctx[1].onclick ? 'button' : 'td')(svelte_element, svelte_element_data = get_spread_update(svelte_element_levels, [
					dirty & /*$$restProps*/ 4 && /*$$restProps*/ ctx[2],
					(!current || dirty & /*tdClassfinal*/ 1) && { class: /*tdClassfinal*/ ctx[0] },
					(!current || dirty & /*$$props*/ 2 && svelte_element_role_value !== (svelte_element_role_value = /*$$props*/ ctx[1].onclick ? 'button' : undefined)) && { role: svelte_element_role_value }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_dynamic_element$1.name,
			type: "child_dynamic_element",
			source: "(10:0) <svelte:element this={$$props.onclick ? 'button' : 'td'} {...$$restProps} class={tdClassfinal} on:click role={$$props.onclick ? 'button' : undefined}>",
			ctx
		});

		return block;
	}

	function create_fragment$e(ctx) {
		let previous_tag = /*$$props*/ ctx[1].onclick ? 'button' : 'td';
		let svelte_element_anchor;
		let current;
		validate_dynamic_element(/*$$props*/ ctx[1].onclick ? 'button' : 'td');
		validate_void_dynamic_element(/*$$props*/ ctx[1].onclick ? 'button' : 'td');
		let svelte_element = (/*$$props*/ ctx[1].onclick ? 'button' : 'td') && create_dynamic_element$1(ctx);

		const block = {
			c: function create() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert_dev(target, svelte_element_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (/*$$props*/ ctx[1].onclick ? 'button' : 'td') {
					if (!previous_tag) {
						svelte_element = create_dynamic_element$1(ctx);
						previous_tag = /*$$props*/ ctx[1].onclick ? 'button' : 'td';
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*$$props*/ ctx[1].onclick ? 'button' : 'td')) {
						svelte_element.d(1);
						validate_dynamic_element(/*$$props*/ ctx[1].onclick ? 'button' : 'td');
						validate_void_dynamic_element(/*$$props*/ ctx[1].onclick ? 'button' : 'td');
						svelte_element = create_dynamic_element$1(ctx);
						previous_tag = /*$$props*/ ctx[1].onclick ? 'button' : 'td';
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*$$props*/ ctx[1].onclick ? 'button' : 'td';
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(svelte_element, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(svelte_element, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$e.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$e($$self, $$props, $$invalidate) {
		const omit_props_names = ["tdClass"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TableBodyCell', slots, ['default']);
		let { tdClass = 'px-6 py-4 whitespace-nowrap font-medium ' } = $$props;
		let color = 'default';
		color = getContext('color');
		let tdClassfinal;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(2, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('tdClass' in $$new_props) $$invalidate(3, tdClass = $$new_props.tdClass);
			if ('$$scope' in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			getContext,
			tdClass,
			color,
			tdClassfinal
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(1, $$props = assign(assign({}, $$props), $$new_props));
			if ('tdClass' in $$props) $$invalidate(3, tdClass = $$new_props.tdClass);
			if ('color' in $$props) $$invalidate(4, color = $$new_props.color);
			if ('tdClassfinal' in $$props) $$invalidate(0, tdClassfinal = $$new_props.tdClassfinal);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			$$invalidate(0, tdClassfinal = twMerge(
				tdClass,
				color === 'default'
				? 'text-gray-900 dark:text-white'
				: 'text-blue-50 whitespace-nowrap dark:text-blue-100',
				$$props.class
			));
		};

		$$props = exclude_internal_props($$props);

		return [
			tdClassfinal,
			$$props,
			$$restProps,
			tdClass,
			color,
			$$scope,
			slots,
			click_handler
		];
	}

	class TableBodyCell extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$e, create_fragment$e, safe_not_equal, { tdClass: 3 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TableBodyCell",
				options,
				id: create_fragment$e.name
			});
		}

		get tdClass() {
			throw new Error("<TableBodyCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tdClass(value) {
			throw new Error("<TableBodyCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/TableBodyRow.svelte generated by Svelte v4.2.12 */
	const file$d = "node_modules/flowbite-svelte/dist/table/TableBodyRow.svelte";

	function create_fragment$d(ctx) {
		let tr;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[4].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
		let tr_levels = [/*$$restProps*/ ctx[1], { class: /*trClass*/ ctx[0] }];
		let tr_data = {};

		for (let i = 0; i < tr_levels.length; i += 1) {
			tr_data = assign(tr_data, tr_levels[i]);
		}

		const block = {
			c: function create() {
				tr = element("tr");
				if (default_slot) default_slot.c();
				set_attributes(tr, tr_data);
				add_location(tr, file$d, 34, 0, 1519);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, tr, anchor);

				if (default_slot) {
					default_slot.m(tr, null);
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(tr, "click", /*click_handler*/ ctx[5], false, false, false, false),
						listen_dev(tr, "contextmenu", /*contextmenu_handler*/ ctx[6], false, false, false, false),
						listen_dev(tr, "dblclick", /*dblclick_handler*/ ctx[7], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}

				set_attributes(tr, tr_data = get_spread_update(tr_levels, [
					dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1],
					(!current || dirty & /*trClass*/ 1) && { class: /*trClass*/ ctx[0] }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(tr);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$d.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$d($$self, $$props, $$invalidate) {
		const omit_props_names = ["color"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TableBodyRow', slots, ['default']);
		let { color = getContext('color') } = $$props;

		const colors = {
			default: 'bg-white dark:bg-gray-800 dark:border-gray-700',
			blue: 'bg-blue-500 border-blue-400',
			green: 'bg-green-500 border-green-400',
			red: 'bg-red-500 border-red-400',
			yellow: 'bg-yellow-500 border-yellow-400',
			purple: 'bg-purple-500 border-purple-400',
			custom: ''
		};

		const hoverColors = {
			default: 'hover:bg-gray-50 dark:hover:bg-gray-600',
			blue: 'hover:bg-blue-400',
			green: 'hover:bg-green-400',
			red: 'hover:bg-red-400',
			yellow: 'hover:bg-yellow-400',
			purple: 'hover:bg-purple-400',
			custom: ''
		};

		const stripColors = {
			default: 'odd:bg-white even:bg-gray-50 odd:dark:bg-gray-800 even:dark:bg-gray-700',
			blue: 'odd:bg-blue-800 even:bg-blue-700 odd:dark:bg-blue-800 even:dark:bg-blue-700',
			green: 'odd:bg-green-800 even:bg-green-700 odd:dark:bg-green-800 even:dark:bg-green-700',
			red: 'odd:bg-red-800 even:bg-red-700 odd:dark:bg-red-800 even:dark:bg-red-700',
			yellow: 'odd:bg-yellow-800 even:bg-yellow-700 odd:dark:bg-yellow-800 even:dark:bg-yellow-700',
			purple: 'odd:bg-purple-800 even:bg-purple-700 odd:dark:bg-purple-800 even:dark:bg-purple-700',
			custom: ''
		};

		let trClass;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function contextmenu_handler(event) {
			bubble.call(this, $$self, event);
		}

		function dblclick_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('color' in $$new_props) $$invalidate(2, color = $$new_props.color);
			if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			getContext,
			color,
			colors,
			hoverColors,
			stripColors,
			trClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(11, $$props = assign(assign({}, $$props), $$new_props));
			if ('color' in $$props) $$invalidate(2, color = $$new_props.color);
			if ('trClass' in $$props) $$invalidate(0, trClass = $$new_props.trClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			$$invalidate(0, trClass = twMerge([
				!getContext('noborder') && 'border-b last:border-b-0',
				colors[color],
				getContext('hoverable') && hoverColors[color],
				getContext('striped') && stripColors[color],
				$$props.class
			]));
		};

		$$props = exclude_internal_props($$props);

		return [
			trClass,
			$$restProps,
			color,
			$$scope,
			slots,
			click_handler,
			contextmenu_handler,
			dblclick_handler
		];
	}

	class TableBodyRow extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$d, create_fragment$d, safe_not_equal, { color: 2 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TableBodyRow",
				options,
				id: create_fragment$d.name
			});
		}

		get color() {
			throw new Error("<TableBodyRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<TableBodyRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/TableHead.svelte generated by Svelte v4.2.12 */
	const file$c = "node_modules/flowbite-svelte/dist/table/TableHead.svelte";

	// (29:2) {:else}
	function create_else_block$7(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

		const block = {
			c: function create() {
				if (default_slot) default_slot.c();
			},
			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[5],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$7.name,
			type: "else",
			source: "(29:2) {:else}",
			ctx
		});

		return block;
	}

	// (25:2) {#if defaultRow}
	function create_if_block$a(ctx) {
		let tr;
		let current;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

		const block = {
			c: function create() {
				tr = element("tr");
				if (default_slot) default_slot.c();
				add_location(tr, file$c, 25, 4, 1006);
			},
			m: function mount(target, anchor) {
				insert_dev(target, tr, anchor);

				if (default_slot) {
					default_slot.m(tr, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[5],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(tr);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$a.name,
			type: "if",
			source: "(25:2) {#if defaultRow}",
			ctx
		});

		return block;
	}

	function create_fragment$c(ctx) {
		let thead;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block$a, create_else_block$7];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*defaultRow*/ ctx[0]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		let thead_levels = [/*$$restProps*/ ctx[2], { class: /*theadClassfinal*/ ctx[1] }];
		let thead_data = {};

		for (let i = 0; i < thead_levels.length; i += 1) {
			thead_data = assign(thead_data, thead_levels[i]);
		}

		const block = {
			c: function create() {
				thead = element("thead");
				if_block.c();
				set_attributes(thead, thead_data);
				add_location(thead, file$c, 23, 0, 934);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, thead, anchor);
				if_blocks[current_block_type_index].m(thead, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(thead, null);
				}

				set_attributes(thead, thead_data = get_spread_update(thead_levels, [
					dirty & /*$$restProps*/ 4 && /*$$restProps*/ ctx[2],
					(!current || dirty & /*theadClassfinal*/ 2) && { class: /*theadClassfinal*/ ctx[1] }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(thead);
				}

				if_blocks[current_block_type_index].d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$c.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$c($$self, $$props, $$invalidate) {
		let theadClassfinal;
		const omit_props_names = ["theadClass","defaultRow"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TableHead', slots, ['default']);
		let { theadClass = 'text-xs uppercase' } = $$props;
		let { defaultRow = true } = $$props;
		let color;
		color = getContext('color');
		let noborder = getContext('noborder');
		let striped = getContext('striped');
		let defaultBgColor = noborder || striped ? '' : 'bg-gray-50 dark:bg-gray-700';

		const bgColors = {
			default: defaultBgColor,
			blue: 'bg-blue-600',
			green: 'bg-green-600',
			red: 'bg-red-600',
			yellow: 'bg-yellow-600',
			purple: 'bg-purple-600',
			custom: ''
		};

		let textColor = color === 'default'
		? 'text-gray-700 dark:text-gray-400'
		: color === 'custom' ? '' : 'text-white  dark:text-white';

		let borderColors = striped
		? ''
		: color === 'default'
			? 'border-gray-700'
			: color === 'custom' ? '' : `border-${color}-400`;

		$$self.$$set = $$new_props => {
			$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(2, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('theadClass' in $$new_props) $$invalidate(3, theadClass = $$new_props.theadClass);
			if ('defaultRow' in $$new_props) $$invalidate(0, defaultRow = $$new_props.defaultRow);
			if ('$$scope' in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			getContext,
			theadClass,
			defaultRow,
			color,
			noborder,
			striped,
			defaultBgColor,
			bgColors,
			textColor,
			borderColors,
			theadClassfinal
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
			if ('theadClass' in $$props) $$invalidate(3, theadClass = $$new_props.theadClass);
			if ('defaultRow' in $$props) $$invalidate(0, defaultRow = $$new_props.defaultRow);
			if ('color' in $$props) $$invalidate(4, color = $$new_props.color);
			if ('noborder' in $$props) noborder = $$new_props.noborder;
			if ('striped' in $$props) $$invalidate(8, striped = $$new_props.striped);
			if ('defaultBgColor' in $$props) defaultBgColor = $$new_props.defaultBgColor;
			if ('textColor' in $$props) $$invalidate(11, textColor = $$new_props.textColor);
			if ('borderColors' in $$props) $$invalidate(12, borderColors = $$new_props.borderColors);
			if ('theadClassfinal' in $$props) $$invalidate(1, theadClassfinal = $$new_props.theadClassfinal);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			$$invalidate(1, theadClassfinal = twMerge(theadClass, textColor, striped && borderColors, bgColors[color], $$props.class));
		};

		$$props = exclude_internal_props($$props);
		return [defaultRow, theadClassfinal, $$restProps, theadClass, color, $$scope, slots];
	}

	class TableHead extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$c, create_fragment$c, safe_not_equal, { theadClass: 3, defaultRow: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TableHead",
				options,
				id: create_fragment$c.name
			});
		}

		get theadClass() {
			throw new Error("<TableHead>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set theadClass(value) {
			throw new Error("<TableHead>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get defaultRow() {
			throw new Error("<TableHead>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set defaultRow(value) {
			throw new Error("<TableHead>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/table/TableHeadCell.svelte generated by Svelte v4.2.12 */
	const file$b = "node_modules/flowbite-svelte/dist/table/TableHeadCell.svelte";

	function create_fragment$b(ctx) {
		let th;
		let th_class_value;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[4].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

		let th_levels = [
			/*$$restProps*/ ctx[1],
			{
				class: th_class_value = twMerge(/*padding*/ ctx[0], /*$$props*/ ctx[2].class)
			}
		];

		let th_data = {};

		for (let i = 0; i < th_levels.length; i += 1) {
			th_data = assign(th_data, th_levels[i]);
		}

		const block = {
			c: function create() {
				th = element("th");
				if (default_slot) default_slot.c();
				set_attributes(th, th_data);
				add_location(th, file$b, 4, 0, 95);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, th, anchor);

				if (default_slot) {
					default_slot.m(th, null);
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(th, "click", /*click_handler*/ ctx[5], false, false, false, false),
						listen_dev(th, "focus", /*focus_handler*/ ctx[6], false, false, false, false),
						listen_dev(th, "keydown", /*keydown_handler*/ ctx[7], false, false, false, false),
						listen_dev(th, "keypress", /*keypress_handler*/ ctx[8], false, false, false, false),
						listen_dev(th, "keyup", /*keyup_handler*/ ctx[9], false, false, false, false),
						listen_dev(th, "mouseenter", /*mouseenter_handler*/ ctx[10], false, false, false, false),
						listen_dev(th, "mouseleave", /*mouseleave_handler*/ ctx[11], false, false, false, false),
						listen_dev(th, "mouseover", /*mouseover_handler*/ ctx[12], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}

				set_attributes(th, th_data = get_spread_update(th_levels, [
					dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1],
					(!current || dirty & /*padding, $$props*/ 5 && th_class_value !== (th_class_value = twMerge(/*padding*/ ctx[0], /*$$props*/ ctx[2].class))) && { class: th_class_value }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(th);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$b.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$b($$self, $$props, $$invalidate) {
		const omit_props_names = ["padding"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TableHeadCell', slots, ['default']);
		let { padding = 'px-6 py-3' } = $$props;

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focus_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keypress_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseover_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$new_props => {
			$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('padding' in $$new_props) $$invalidate(0, padding = $$new_props.padding);
			if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({ twMerge, padding });

		$$self.$inject_state = $$new_props => {
			$$invalidate(2, $$props = assign(assign({}, $$props), $$new_props));
			if ('padding' in $$props) $$invalidate(0, padding = $$new_props.padding);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$props = exclude_internal_props($$props);

		return [
			padding,
			$$restProps,
			$$props,
			$$scope,
			slots,
			click_handler,
			focus_handler,
			keydown_handler,
			keypress_handler,
			keyup_handler,
			mouseenter_handler,
			mouseleave_handler,
			mouseover_handler
		];
	}

	class TableHeadCell extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$b, create_fragment$b, safe_not_equal, { padding: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TableHeadCell",
				options,
				id: create_fragment$b.name
			});
		}

		get padding() {
			throw new Error("<TableHeadCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set padding(value) {
			throw new Error("<TableHeadCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/tabs/TabItem.svelte generated by Svelte v4.2.12 */
	const file$a = "node_modules/flowbite-svelte/dist/tabs/TabItem.svelte";
	const get_title_slot_changes = dirty => ({});
	const get_title_slot_context = ctx => ({});

	// (29:23) {title}
	function fallback_block$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text(/*title*/ ctx[1]);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*title*/ 2) set_data_dev(t, /*title*/ ctx[1]);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: fallback_block$1.name,
			type: "fallback",
			source: "(29:23) {title}",
			ctx
		});

		return block;
	}

	// (32:2) {#if open}
	function create_if_block$9(ctx) {
		let div1;
		let div0;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[10].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				if (default_slot) default_slot.c();
				add_location(div0, file$a, 33, 6, 1298);
				attr_dev(div1, "class", "hidden tab_content_placeholder");
				add_location(div1, file$a, 32, 4, 1247);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);

				if (default_slot) {
					default_slot.m(div0, null);
				}

				current = true;

				if (!mounted) {
					dispose = action_destroyer(/*init*/ ctx[3].call(null, div0));
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[9],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null),
							null
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				if (default_slot) default_slot.d(detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$9.name,
			type: "if",
			source: "(32:2) {#if open}",
			ctx
		});

		return block;
	}

	function create_fragment$a(ctx) {
		let li;
		let button;
		let t;
		let li_class_value;
		let current;
		let mounted;
		let dispose;
		const title_slot_template = /*#slots*/ ctx[10].title;
		const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[9], get_title_slot_context);
		const title_slot_or_fallback = title_slot || fallback_block$1(ctx);

		let button_levels = [
			{ type: "button" },
			{ role: "tab" },
			/*$$restProps*/ ctx[5],
			{ class: /*buttonClass*/ ctx[2] }
		];

		let button_data = {};

		for (let i = 0; i < button_levels.length; i += 1) {
			button_data = assign(button_data, button_levels[i]);
		}

		let if_block = /*open*/ ctx[0] && create_if_block$9(ctx);

		const block = {
			c: function create() {
				li = element("li");
				button = element("button");
				if (title_slot_or_fallback) title_slot_or_fallback.c();
				t = space();
				if (if_block) if_block.c();
				set_attributes(button, button_data);
				add_location(button, file$a, 27, 2, 963);
				attr_dev(li, "class", li_class_value = twMerge('group', /*$$props*/ ctx[4].class));
				attr_dev(li, "role", "presentation");
				add_location(li, file$a, 26, 0, 896);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, li, anchor);
				append_dev(li, button);

				if (title_slot_or_fallback) {
					title_slot_or_fallback.m(button, null);
				}

				if (button.autofocus) button.focus();
				append_dev(li, t);
				if (if_block) if_block.m(li, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button, "click", /*click_handler_1*/ ctx[21], false, false, false, false),
						listen_dev(button, "blur", /*blur_handler*/ ctx[11], false, false, false, false),
						listen_dev(button, "click", /*click_handler*/ ctx[12], false, false, false, false),
						listen_dev(button, "contextmenu", /*contextmenu_handler*/ ctx[13], false, false, false, false),
						listen_dev(button, "focus", /*focus_handler*/ ctx[14], false, false, false, false),
						listen_dev(button, "keydown", /*keydown_handler*/ ctx[15], false, false, false, false),
						listen_dev(button, "keypress", /*keypress_handler*/ ctx[16], false, false, false, false),
						listen_dev(button, "keyup", /*keyup_handler*/ ctx[17], false, false, false, false),
						listen_dev(button, "mouseenter", /*mouseenter_handler*/ ctx[18], false, false, false, false),
						listen_dev(button, "mouseleave", /*mouseleave_handler*/ ctx[19], false, false, false, false),
						listen_dev(button, "mouseover", /*mouseover_handler*/ ctx[20], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (title_slot) {
					if (title_slot.p && (!current || dirty & /*$$scope*/ 512)) {
						update_slot_base(
							title_slot,
							title_slot_template,
							ctx,
							/*$$scope*/ ctx[9],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
							: get_slot_changes(title_slot_template, /*$$scope*/ ctx[9], dirty, get_title_slot_changes),
							get_title_slot_context
						);
					}
				} else {
					if (title_slot_or_fallback && title_slot_or_fallback.p && (!current || dirty & /*title*/ 2)) {
						title_slot_or_fallback.p(ctx, !current ? -1 : dirty);
					}
				}

				set_attributes(button, button_data = get_spread_update(button_levels, [
					{ type: "button" },
					{ role: "tab" },
					dirty & /*$$restProps*/ 32 && /*$$restProps*/ ctx[5],
					(!current || dirty & /*buttonClass*/ 4) && { class: /*buttonClass*/ ctx[2] }
				]));

				if (/*open*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*open*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$9(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(li, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				if (!current || dirty & /*$$props*/ 16 && li_class_value !== (li_class_value = twMerge('group', /*$$props*/ ctx[4].class))) {
					attr_dev(li, "class", li_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(title_slot_or_fallback, local);
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(title_slot_or_fallback, local);
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(li);
				}

				if (title_slot_or_fallback) title_slot_or_fallback.d(detaching);
				if (if_block) if_block.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$a.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$a($$self, $$props, $$invalidate) {
		const omit_props_names = ["open","title","activeClasses","inactiveClasses","defaultClass"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TabItem', slots, ['title','default']);
		let { open = false } = $$props;
		let { title = 'Tab title' } = $$props;
		let { activeClasses = undefined } = $$props;
		let { inactiveClasses = undefined } = $$props;
		let { defaultClass = 'inline-block text-sm font-medium text-center disabled:cursor-not-allowed' } = $$props;
		const ctx = getContext('ctx') ?? {};

		// single selection
		const selected = ctx.selected ?? writable();

		function init(node) {
			selected.set(node);

			const destroy = selected.subscribe(x => {
				if (x !== node) {
					$$invalidate(0, open = false);
				}
			});

			return { destroy };
		}

		let buttonClass;

		function blur_handler(event) {
			bubble.call(this, $$self, event);
		}

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function contextmenu_handler(event) {
			bubble.call(this, $$self, event);
		}

		function focus_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keypress_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseenter_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseleave_handler(event) {
			bubble.call(this, $$self, event);
		}

		function mouseover_handler(event) {
			bubble.call(this, $$self, event);
		}

		const click_handler_1 = () => $$invalidate(0, open = true);

		$$self.$$set = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('open' in $$new_props) $$invalidate(0, open = $$new_props.open);
			if ('title' in $$new_props) $$invalidate(1, title = $$new_props.title);
			if ('activeClasses' in $$new_props) $$invalidate(6, activeClasses = $$new_props.activeClasses);
			if ('inactiveClasses' in $$new_props) $$invalidate(7, inactiveClasses = $$new_props.inactiveClasses);
			if ('defaultClass' in $$new_props) $$invalidate(8, defaultClass = $$new_props.defaultClass);
			if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			getContext,
			writable,
			twMerge,
			open,
			title,
			activeClasses,
			inactiveClasses,
			defaultClass,
			ctx,
			selected,
			init,
			buttonClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), $$new_props));
			if ('open' in $$props) $$invalidate(0, open = $$new_props.open);
			if ('title' in $$props) $$invalidate(1, title = $$new_props.title);
			if ('activeClasses' in $$props) $$invalidate(6, activeClasses = $$new_props.activeClasses);
			if ('inactiveClasses' in $$props) $$invalidate(7, inactiveClasses = $$new_props.inactiveClasses);
			if ('defaultClass' in $$props) $$invalidate(8, defaultClass = $$new_props.defaultClass);
			if ('buttonClass' in $$props) $$invalidate(2, buttonClass = $$new_props.buttonClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*defaultClass, open, activeClasses, inactiveClasses*/ 449) {
				$$invalidate(2, buttonClass = twMerge(
					defaultClass,
					open
					? activeClasses ?? ctx.activeClasses
					: inactiveClasses ?? ctx.inactiveClasses,
					open && 'active'
				)); // $$restProps.disabled && 'cursor-not-allowed pointer-events-none'
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			open,
			title,
			buttonClass,
			init,
			$$props,
			$$restProps,
			activeClasses,
			inactiveClasses,
			defaultClass,
			$$scope,
			slots,
			blur_handler,
			click_handler,
			contextmenu_handler,
			focus_handler,
			keydown_handler,
			keypress_handler,
			keyup_handler,
			mouseenter_handler,
			mouseleave_handler,
			mouseover_handler,
			click_handler_1
		];
	}

	class TabItem extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$a, create_fragment$a, safe_not_equal, {
				open: 0,
				title: 1,
				activeClasses: 6,
				inactiveClasses: 7,
				defaultClass: 8
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TabItem",
				options,
				id: create_fragment$a.name
			});
		}

		get open() {
			throw new Error("<TabItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set open(value) {
			throw new Error("<TabItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get title() {
			throw new Error("<TabItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set title(value) {
			throw new Error("<TabItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get activeClasses() {
			throw new Error("<TabItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set activeClasses(value) {
			throw new Error("<TabItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get inactiveClasses() {
			throw new Error("<TabItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set inactiveClasses(value) {
			throw new Error("<TabItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get defaultClass() {
			throw new Error("<TabItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set defaultClass(value) {
			throw new Error("<TabItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/tabs/Tabs.svelte generated by Svelte v4.2.12 */
	const file$9 = "node_modules/flowbite-svelte/dist/tabs/Tabs.svelte";
	const get_divider_slot_changes = dirty => ({});
	const get_divider_slot_context = ctx => ({});
	const get_default_slot_changes = dirty => ({ style: dirty & /*style*/ 2 });
	const get_default_slot_context = ctx => ({ style: /*style*/ ctx[1] });

	// (45:0) {#if divider}
	function create_if_block$8(ctx) {
		let current;
		const divider_slot_template = /*#slots*/ ctx[9].divider;
		const divider_slot = create_slot(divider_slot_template, ctx, /*$$scope*/ ctx[8], get_divider_slot_context);
		const divider_slot_or_fallback = divider_slot || fallback_block(ctx);

		const block = {
			c: function create() {
				if (divider_slot_or_fallback) divider_slot_or_fallback.c();
			},
			m: function mount(target, anchor) {
				if (divider_slot_or_fallback) {
					divider_slot_or_fallback.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (divider_slot) {
					if (divider_slot.p && (!current || dirty & /*$$scope*/ 256)) {
						update_slot_base(
							divider_slot,
							divider_slot_template,
							ctx,
							/*$$scope*/ ctx[8],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
							: get_slot_changes(divider_slot_template, /*$$scope*/ ctx[8], dirty, get_divider_slot_changes),
							get_divider_slot_context
						);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(divider_slot_or_fallback, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(divider_slot_or_fallback, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (divider_slot_or_fallback) divider_slot_or_fallback.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$8.name,
			type: "if",
			source: "(45:0) {#if divider}",
			ctx
		});

		return block;
	}

	// (46:23)      
	function fallback_block(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "h-px bg-gray-200 dark:bg-gray-700");
				add_location(div, file$9, 46, 4, 2298);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: fallback_block.name,
			type: "fallback",
			source: "(46:23)      ",
			ctx
		});

		return block;
	}

	function create_fragment$9(ctx) {
		let ul;
		let t0;
		let t1;
		let div;
		let current;
		let mounted;
		let dispose;
		const default_slot_template = /*#slots*/ ctx[9].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], get_default_slot_context);
		let if_block = /*divider*/ ctx[0] && create_if_block$8(ctx);

		const block = {
			c: function create() {
				ul = element("ul");
				if (default_slot) default_slot.c();
				t0 = space();
				if (if_block) if_block.c();
				t1 = space();
				div = element("div");
				attr_dev(ul, "class", /*ulClass*/ ctx[3]);
				add_location(ul, file$9, 41, 0, 2210);
				attr_dev(div, "class", /*contentClass*/ ctx[2]);
				attr_dev(div, "role", "tabpanel");
				attr_dev(div, "aria-labelledby", "id-tab");
				add_location(div, file$9, 49, 0, 2364);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, ul, anchor);

				if (default_slot) {
					default_slot.m(ul, null);
				}

				insert_dev(target, t0, anchor);
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, div, anchor);
				current = true;

				if (!mounted) {
					dispose = action_destroyer(/*init*/ ctx[4].call(null, div));
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, style*/ 258)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[8],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, get_default_slot_changes),
							get_default_slot_context
						);
					}
				}

				if (!current || dirty & /*ulClass*/ 8) {
					attr_dev(ul, "class", /*ulClass*/ ctx[3]);
				}

				if (/*divider*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*divider*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$8(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(t1.parentNode, t1);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				if (!current || dirty & /*contentClass*/ 4) {
					attr_dev(div, "class", /*contentClass*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(ul);
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(div);
				}

				if (default_slot) default_slot.d(detaching);
				if (if_block) if_block.d(detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$9.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$9($$self, $$props, $$invalidate) {
		let ulClass;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Tabs', slots, ['default','divider']);
		let { style = 'none' } = $$props;
		let { defaultClass = 'flex flex-wrap space-x-2 rtl:space-x-reverse' } = $$props;
		let { contentClass = 'p-4 bg-gray-50 rounded-lg dark:bg-gray-800 mt-4' } = $$props;
		let { divider = true } = $$props;
		let { activeClasses = 'p-4 text-primary-600 bg-gray-100 rounded-t-lg dark:bg-gray-800 dark:text-primary-500' } = $$props;
		let { inactiveClasses = 'p-4 text-gray-500 rounded-t-lg hover:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300' } = $$props;

		// styles
		const styledActiveClasses = {
			full: 'p-4 w-full group-first:rounded-s-lg group-last:rounded-e-lg text-gray-900 bg-gray-100 focus:ring-4 focus:ring-primary-300 focus:outline-none dark:bg-gray-700 dark:text-white',
			pill: 'py-3 px-4 text-white bg-primary-600 rounded-lg',
			underline: 'p-4 text-primary-600 border-b-2 border-primary-600 dark:text-primary-500 dark:border-primary-500',
			none: ''
		};

		const styledInactiveClasses = {
			full: 'p-4 w-full group-first:rounded-s-lg group-last:rounded-e-lg text-gray-500 dark:text-gray-400 bg-white hover:text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-primary-300 focus:outline-none dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700',
			pill: 'py-3 px-4 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
			underline: 'p-4 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 text-gray-500 dark:text-gray-400',
			none: ''
		};

		const ctx = {
			activeClasses: styledActiveClasses[style] || activeClasses,
			inactiveClasses: styledInactiveClasses[style] || inactiveClasses,
			selected: writable()
		};

		setContext('ctx', ctx);

		function init(node) {
			const destroy = ctx.selected.subscribe(x => {
				if (x) node.replaceChildren(x);
			});

			return { destroy };
		}

		$$self.$$set = $$new_props => {
			$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			if ('style' in $$new_props) $$invalidate(1, style = $$new_props.style);
			if ('defaultClass' in $$new_props) $$invalidate(5, defaultClass = $$new_props.defaultClass);
			if ('contentClass' in $$new_props) $$invalidate(2, contentClass = $$new_props.contentClass);
			if ('divider' in $$new_props) $$invalidate(0, divider = $$new_props.divider);
			if ('activeClasses' in $$new_props) $$invalidate(6, activeClasses = $$new_props.activeClasses);
			if ('inactiveClasses' in $$new_props) $$invalidate(7, inactiveClasses = $$new_props.inactiveClasses);
			if ('$$scope' in $$new_props) $$invalidate(8, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			writable,
			twMerge,
			setContext,
			style,
			defaultClass,
			contentClass,
			divider,
			activeClasses,
			inactiveClasses,
			styledActiveClasses,
			styledInactiveClasses,
			ctx,
			init,
			ulClass
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
			if ('style' in $$props) $$invalidate(1, style = $$new_props.style);
			if ('defaultClass' in $$props) $$invalidate(5, defaultClass = $$new_props.defaultClass);
			if ('contentClass' in $$props) $$invalidate(2, contentClass = $$new_props.contentClass);
			if ('divider' in $$props) $$invalidate(0, divider = $$new_props.divider);
			if ('activeClasses' in $$props) $$invalidate(6, activeClasses = $$new_props.activeClasses);
			if ('inactiveClasses' in $$props) $$invalidate(7, inactiveClasses = $$new_props.inactiveClasses);
			if ('ulClass' in $$props) $$invalidate(3, ulClass = $$new_props.ulClass);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*style, divider*/ 3) {
				$$invalidate(0, divider = ['full', 'pill'].includes(style) ? false : divider);
			}

			$$invalidate(3, ulClass = twMerge(defaultClass, style === 'underline' && '-mb-px', $$props.class));
		};

		$$props = exclude_internal_props($$props);

		return [
			divider,
			style,
			contentClass,
			ulClass,
			init,
			defaultClass,
			activeClasses,
			inactiveClasses,
			$$scope,
			slots
		];
	}

	class Tabs extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$9, create_fragment$9, safe_not_equal, {
				style: 1,
				defaultClass: 5,
				contentClass: 2,
				divider: 0,
				activeClasses: 6,
				inactiveClasses: 7
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Tabs",
				options,
				id: create_fragment$9.name
			});
		}

		get style() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set style(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get defaultClass() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set defaultClass(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get contentClass() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set contentClass(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get divider() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set divider(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get activeClasses() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set activeClasses(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get inactiveClasses() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set inactiveClasses(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/flowbite-svelte/dist/typography/Heading.svelte generated by Svelte v4.2.12 */
	const file$8 = "node_modules/flowbite-svelte/dist/typography/Heading.svelte";

	// (15:0) <svelte:element this={tag} {...$$restProps} class={twMerge(customSize ? customSize : textSizes[tag], color, 'w-full', $$props.class)}>
	function create_dynamic_element(ctx) {
		let svelte_element;
		let svelte_element_class_value;
		let current;
		const default_slot_template = /*#slots*/ ctx[7].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

		let svelte_element_levels = [
			/*$$restProps*/ ctx[4],
			{
				class: svelte_element_class_value = twMerge(
					/*customSize*/ ctx[2]
					? /*customSize*/ ctx[2]
					: /*textSizes*/ ctx[3][/*tag*/ ctx[0]],
					/*color*/ ctx[1],
					'w-full',
					/*$$props*/ ctx[5].class
				)
			}
		];

		let svelte_element_data = {};

		for (let i = 0; i < svelte_element_levels.length; i += 1) {
			svelte_element_data = assign(svelte_element_data, svelte_element_levels[i]);
		}

		const block = {
			c: function create() {
				svelte_element = element(/*tag*/ ctx[0]);
				if (default_slot) default_slot.c();
				set_dynamic_element_data(/*tag*/ ctx[0])(svelte_element, svelte_element_data);
				add_location(svelte_element, file$8, 14, 0, 369);
			},
			m: function mount(target, anchor) {
				insert_dev(target, svelte_element, anchor);

				if (default_slot) {
					default_slot.m(svelte_element, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[6],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
							null
						);
					}
				}

				set_dynamic_element_data(/*tag*/ ctx[0])(svelte_element, svelte_element_data = get_spread_update(svelte_element_levels, [
					dirty & /*$$restProps*/ 16 && /*$$restProps*/ ctx[4],
					(!current || dirty & /*customSize, tag, color, $$props*/ 39 && svelte_element_class_value !== (svelte_element_class_value = twMerge(
						/*customSize*/ ctx[2]
						? /*customSize*/ ctx[2]
						: /*textSizes*/ ctx[3][/*tag*/ ctx[0]],
						/*color*/ ctx[1],
						'w-full',
						/*$$props*/ ctx[5].class
					))) && { class: svelte_element_class_value }
				]));
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_dynamic_element.name,
			type: "child_dynamic_element",
			source: "(15:0) <svelte:element this={tag} {...$$restProps} class={twMerge(customSize ? customSize : textSizes[tag], color, 'w-full', $$props.class)}>",
			ctx
		});

		return block;
	}

	function create_fragment$8(ctx) {
		let previous_tag = /*tag*/ ctx[0];
		let svelte_element_anchor;
		let current;
		validate_dynamic_element(/*tag*/ ctx[0]);
		validate_void_dynamic_element(/*tag*/ ctx[0]);
		let svelte_element = /*tag*/ ctx[0] && create_dynamic_element(ctx);

		const block = {
			c: function create() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert_dev(target, svelte_element_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (/*tag*/ ctx[0]) {
					if (!previous_tag) {
						svelte_element = create_dynamic_element(ctx);
						previous_tag = /*tag*/ ctx[0];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*tag*/ ctx[0])) {
						svelte_element.d(1);
						validate_dynamic_element(/*tag*/ ctx[0]);
						validate_void_dynamic_element(/*tag*/ ctx[0]);
						svelte_element = create_dynamic_element(ctx);
						previous_tag = /*tag*/ ctx[0];
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*tag*/ ctx[0];
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(svelte_element, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(svelte_element, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$8.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$8($$self, $$props, $$invalidate) {
		const omit_props_names = ["tag","color","customSize"];
		let $$restProps = compute_rest_props($$props, omit_props_names);
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Heading', slots, ['default']);
		let { tag = 'h1' } = $$props;
		let { color = 'text-gray-900 dark:text-white' } = $$props;
		let { customSize = '' } = $$props;

		const textSizes = {
			h1: 'text-5xl font-extrabold',
			h2: 'text-4xl font-bold',
			h3: 'text-3xl font-bold',
			h4: 'text-2xl font-bold',
			h5: 'text-xl font-bold',
			h6: 'text-lg font-bold'
		};

		$$self.$$set = $$new_props => {
			$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			$$invalidate(4, $$restProps = compute_rest_props($$props, omit_props_names));
			if ('tag' in $$new_props) $$invalidate(0, tag = $$new_props.tag);
			if ('color' in $$new_props) $$invalidate(1, color = $$new_props.color);
			if ('customSize' in $$new_props) $$invalidate(2, customSize = $$new_props.customSize);
			if ('$$scope' in $$new_props) $$invalidate(6, $$scope = $$new_props.$$scope);
		};

		$$self.$capture_state = () => ({
			twMerge,
			tag,
			color,
			customSize,
			textSizes
		});

		$$self.$inject_state = $$new_props => {
			$$invalidate(5, $$props = assign(assign({}, $$props), $$new_props));
			if ('tag' in $$props) $$invalidate(0, tag = $$new_props.tag);
			if ('color' in $$props) $$invalidate(1, color = $$new_props.color);
			if ('customSize' in $$props) $$invalidate(2, customSize = $$new_props.customSize);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$props = exclude_internal_props($$props);
		return [tag, color, customSize, textSizes, $$restProps, $$props, $$scope, slots];
	}

	class Heading extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { tag: 0, color: 1, customSize: 2 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Heading",
				options,
				id: create_fragment$8.name
			});
		}

		get tag() {
			throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tag(value) {
			throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get color() {
			throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set color(value) {
			throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get customSize() {
			throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set customSize(value) {
			throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	// Function to fetch classes from the backend
	async function fetchClasses() {
	    try {
	        const response = await fetch('/api/classes');
	        if (!response.ok) {
	            console.error('Failed to fetch classes');
	            return [];
	        }
	        const classes = await response.json();
	        return classes;
	    }
	    catch (error) {
	        console.error('Error fetching classes:', error);
	        return [];
	    }
	}

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
	    month: 'long',
	    day: '2-digit',
	    hour: 'numeric',
	    minute: '2-digit',
	    hour12: true
	});
	// Function to format date, adding "at" between date and time
	function formatScheduleTime(scheduleTime) {
	    const formattedDate = dateFormatter.format(new Date(scheduleTime));
	    return formattedDate.replace(',', ' at'); // Replace the first comma with ' at'
	}

	/* src/frontend/components/Classes.svelte generated by Svelte v4.2.12 */

	const { console: console_1$6 } = globals;

	const file$7 = "src/frontend/components/Classes.svelte";

	function get_each_context$6(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		child_ctx[24] = list;
		child_ctx[25] = i;
		return child_ctx;
	}

	// (84:4) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_30$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Add a class");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_30$1.name,
			type: "slot",
			source: "(84:4) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (88:16) <Label for="className" class="mb-2">
	function create_default_slot_29$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class Name:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_29$2.name,
			type: "slot",
			source: "(88:16) <Label for=\\\"className\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (92:16) <Label for="scheduleTime" class="mb-2">
	function create_default_slot_28$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Schedule Time:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_28$2.name,
			type: "slot",
			source: "(92:16) <Label for=\\\"scheduleTime\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (96:16) <Label for="attendance" class="mb-2">
	function create_default_slot_27$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Attendance:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_27$2.name,
			type: "slot",
			source: "(96:16) <Label for=\\\"attendance\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (100:16) <Label for="maxParticipants" class="mb-2">
	function create_default_slot_26$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Max Participants:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_26$3.name,
			type: "slot",
			source: "(100:16) <Label for=\\\"maxParticipants\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (102:16) <Helper class="text-sm mt-2">
	function create_default_slot_25$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("This is the maximum amount of participants that can be in the class each time it runs.");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_25$3.name,
			type: "slot",
			source: "(102:16) <Helper class=\\\"text-sm mt-2\\\">",
			ctx
		});

		return block;
	}

	// (107:8) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_24$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Submit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_24$3.name,
			type: "slot",
			source: "(107:8) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (115:12) <TableHeadCell>
	function create_default_slot_23$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_23$3.name,
			type: "slot",
			source: "(115:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (116:12) <TableHeadCell>
	function create_default_slot_22$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_22$3.name,
			type: "slot",
			source: "(116:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (117:12) <TableHeadCell>
	function create_default_slot_21$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Schedule Time");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_21$4.name,
			type: "slot",
			source: "(117:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (118:12) <TableHeadCell>
	function create_default_slot_20$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Attendance");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20$5.name,
			type: "slot",
			source: "(118:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (119:12) <TableHeadCell>
	function create_default_slot_19$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Max Participants");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19$5.name,
			type: "slot",
			source: "(119:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (120:12) <TableHeadCell>
	function create_default_slot_18$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18$5.name,
			type: "slot",
			source: "(120:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (114:4) <TableHead>
	function create_default_slot_17$6(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let t3;
		let tableheadcell4;
		let t4;
		let tableheadcell5;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_23$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_22$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_21$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_20$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell4 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_19$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell5 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_18$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
				t3 = space();
				create_component(tableheadcell4.$$.fragment);
				t4 = space();
				create_component(tableheadcell5.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tableheadcell4, target, anchor);
				insert_dev(target, t4, anchor);
				mount_component(tableheadcell5, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
				const tableheadcell4_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell4_changes.$$scope = { dirty, ctx };
				}

				tableheadcell4.$set(tableheadcell4_changes);
				const tableheadcell5_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell5_changes.$$scope = { dirty, ctx };
				}

				tableheadcell5.$set(tableheadcell5_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				transition_in(tableheadcell4.$$.fragment, local);
				transition_in(tableheadcell5.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				transition_out(tableheadcell4.$$.fragment, local);
				transition_out(tableheadcell5.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
				destroy_component(tableheadcell4, detaching);
				destroy_component(tableheadcell5, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$6.name,
			type: "slot",
			source: "(114:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (125:8) <TableBodyCell>
	function create_default_slot_16$6(ctx) {
		let t_value = /*classItem*/ ctx[23].classId + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*classes*/ 16 && t_value !== (t_value = /*classItem*/ ctx[23].classId + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$6.name,
			type: "slot",
			source: "(125:8) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (131:8) {:else}
	function create_else_block_1$6(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_15$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_14$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_13$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_12$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$6.name,
			type: "else",
			source: "(131:8) {:else}",
			ctx
		});

		return block;
	}

	// (126:8) {#if editingClassId === classItem.classId}
	function create_if_block_1$7(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_11$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$7.name,
			type: "if",
			source: "(126:8) {#if editingClassId === classItem.classId}",
			ctx
		});

		return block;
	}

	// (132:12) <TableBodyCell>
	function create_default_slot_15$6(ctx) {
		let t_value = /*classItem*/ ctx[23].className + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*classes*/ 16 && t_value !== (t_value = /*classItem*/ ctx[23].className + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$6.name,
			type: "slot",
			source: "(132:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (133:12) <TableBodyCell>
	function create_default_slot_14$6(ctx) {
		let t_value = formatScheduleTime(/*classItem*/ ctx[23].scheduleTime) + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*classes*/ 16 && t_value !== (t_value = formatScheduleTime(/*classItem*/ ctx[23].scheduleTime) + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$6.name,
			type: "slot",
			source: "(133:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (134:12) <TableBodyCell>
	function create_default_slot_13$6(ctx) {
		let t_value = /*classItem*/ ctx[23].attendance + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*classes*/ 16 && t_value !== (t_value = /*classItem*/ ctx[23].attendance + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$6.name,
			type: "slot",
			source: "(134:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (135:12) <TableBodyCell>
	function create_default_slot_12$6(ctx) {
		let t_value = /*classItem*/ ctx[23].maxParticipants + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*classes*/ 16 && t_value !== (t_value = /*classItem*/ ctx[23].maxParticipants + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$6.name,
			type: "slot",
			source: "(135:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (127:12) <TableBodyCell>
	function create_default_slot_11$6(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[15](value, /*classItem*/ ctx[23]);
		}

		let input_props = { type: "text" };

		if (/*classItem*/ ctx[23].className !== void 0) {
			input_props.value = /*classItem*/ ctx[23].className;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*classes*/ 16) {
					updating_value = true;
					input_changes.value = /*classItem*/ ctx[23].className;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$6.name,
			type: "slot",
			source: "(127:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (128:12) <TableBodyCell>
	function create_default_slot_10$6(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_1(value) {
			/*input_value_binding_1*/ ctx[16](value, /*classItem*/ ctx[23]);
		}

		let input_props = { type: "datetime-local" };

		if (/*classItem*/ ctx[23].scheduleTime !== void 0) {
			input_props.value = /*classItem*/ ctx[23].scheduleTime;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*classes*/ 16) {
					updating_value = true;
					input_changes.value = /*classItem*/ ctx[23].scheduleTime;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$6.name,
			type: "slot",
			source: "(128:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (129:12) <TableBodyCell>
	function create_default_slot_9$6(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_2(value) {
			/*input_value_binding_2*/ ctx[17](value, /*classItem*/ ctx[23]);
		}

		let input_props = { type: "number" };

		if (/*classItem*/ ctx[23].attendance !== void 0) {
			input_props.value = /*classItem*/ ctx[23].attendance;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_2));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*classes*/ 16) {
					updating_value = true;
					input_changes.value = /*classItem*/ ctx[23].attendance;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$6.name,
			type: "slot",
			source: "(129:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (130:12) <TableBodyCell>
	function create_default_slot_8$7(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_3(value) {
			/*input_value_binding_3*/ ctx[18](value, /*classItem*/ ctx[23]);
		}

		let input_props = { type: "number" };

		if (/*classItem*/ ctx[23].maxParticipants !== void 0) {
			input_props.value = /*classItem*/ ctx[23].maxParticipants;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_3));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*classes*/ 16) {
					updating_value = true;
					input_changes.value = /*classItem*/ ctx[23].maxParticipants;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$7.name,
			type: "slot",
			source: "(130:12) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (141:12) {:else}
	function create_else_block$6(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[20](/*classItem*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler_1);

		function click_handler_2() {
			return /*click_handler_2*/ ctx[21](/*classItem*/ ctx[23]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_2);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$6.name,
			type: "else",
			source: "(141:12) {:else}",
			ctx
		});

		return block;
	}

	// (138:12) {#if editingClassId === classItem.classId}
	function create_if_block$7(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[19](/*classItem*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[9]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$7.name,
			type: "if",
			source: "(138:12) {#if editingClassId === classItem.classId}",
			ctx
		});

		return block;
	}

	// (142:16) <Button color="blue" on:click={() => startEditing(classItem.classId)}>
	function create_default_slot_7$7(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$7.name,
			type: "slot",
			source: "(142:16) <Button color=\\\"blue\\\" on:click={() => startEditing(classItem.classId)}>",
			ctx
		});

		return block;
	}

	// (143:16) <Button color="red" on:click={() => deleteClass(classItem.classId)}>
	function create_default_slot_6$7(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$7.name,
			type: "slot",
			source: "(143:16) <Button color=\\\"red\\\" on:click={() => deleteClass(classItem.classId)}>",
			ctx
		});

		return block;
	}

	// (139:16) <Button color="green" on:click={() => updateClass(classItem.classId)}>
	function create_default_slot_5$7(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$7.name,
			type: "slot",
			source: "(139:16) <Button color=\\\"green\\\" on:click={() => updateClass(classItem.classId)}>",
			ctx
		});

		return block;
	}

	// (140:16) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$7(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$7.name,
			type: "slot",
			source: "(140:16) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (137:8) <TableBodyCell>
	function create_default_slot_3$7(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$7, create_else_block$6];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*editingClassId*/ ctx[5] === /*classItem*/ ctx[23].classId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$7.name,
			type: "slot",
			source: "(137:8) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (124:4) <TableBodyRow>
	function create_default_slot_2$7(ctx) {
		let tablebodycell0;
		let t0;
		let current_block_type_index;
		let if_block;
		let t1;
		let tablebodycell1;
		let t2;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_16$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const if_block_creators = [create_if_block_1$7, create_else_block_1$6];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*editingClassId*/ ctx[5] === /*classItem*/ ctx[23].classId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				if_block.c();
				t1 = space();
				create_component(tablebodycell1.$$.fragment);
				t2 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t2, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, classes*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(t1.parentNode, t1);
				}

				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, classes, editingClassId*/ 67108912) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(if_block);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(if_block);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				if_blocks[current_block_type_index].d(detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$7.name,
			type: "slot",
			source: "(124:4) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (123:8) {#each classes as classItem}
	function create_each_block$6(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty & /*$$scope, classes, editingClassId*/ 67108912) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$6.name,
			type: "each",
			source: "(123:8) {#each classes as classItem}",
			ctx
		});

		return block;
	}

	// (122:4) <TableBody>
	function create_default_slot_1$7(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*classes*/ ctx[4]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*stopEditing, updateClass, classes, editingClassId, deleteClass, startEditing*/ 1968) {
					each_value = ensure_array_like_dev(/*classes*/ ctx[4]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$6(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$6(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$7.name,
			type: "slot",
			source: "(122:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (109:0) <Table class="mt-4">
	function create_default_slot$7(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_17$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Fitness Classes\n        ");
				p = element("p");
				p.textContent = "Here are a list of the current fitness classes offered at the gym.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$7, 126, 8, 4076);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$7, 124, 4, 3934);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty & /*$$scope, classes, editingClassId*/ 67108912) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$7.name,
			type: "slot",
			source: "(109:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$7(ctx) {
		let heading;
		let t0;
		let form;
		let div4;
		let div0;
		let label0;
		let t1;
		let input0;
		let updating_value;
		let t2;
		let div1;
		let label1;
		let t3;
		let input1;
		let updating_value_1;
		let t4;
		let div2;
		let label2;
		let t5;
		let input2;
		let updating_value_2;
		let t6;
		let div3;
		let label3;
		let t7;
		let input3;
		let updating_value_3;
		let t8;
		let helper;
		let t9;
		let button;
		let t10;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_30$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "className",
					class: "mb-2",
					$$slots: { default: [create_default_slot_29$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[11](value);
		}

		let input0_props = {
			type: "text",
			id: "className",
			placeholder: "i.e. Yoga",
			required: true
		};

		if (/*className*/ ctx[0] !== void 0) {
			input0_props.value = /*className*/ ctx[0];
		}

		input0 = new Input({ props: input0_props, $$inline: true });
		binding_callbacks.push(() => bind(input0, 'value', input0_value_binding));

		label1 = new Label({
				props: {
					for: "scheduleTime",
					class: "mb-2",
					$$slots: { default: [create_default_slot_28$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[12](value);
		}

		let input1_props = {
			type: "datetime-local",
			id: "scheduleTime",
			required: true
		};

		if (/*scheduleTime*/ ctx[1] !== void 0) {
			input1_props.value = /*scheduleTime*/ ctx[1];
		}

		input1 = new Input({ props: input1_props, $$inline: true });
		binding_callbacks.push(() => bind(input1, 'value', input1_value_binding));

		label2 = new Label({
				props: {
					for: "attendance",
					class: "mb-2",
					$$slots: { default: [create_default_slot_27$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input2_value_binding(value) {
			/*input2_value_binding*/ ctx[13](value);
		}

		let input2_props = {
			type: "number",
			id: "attendance",
			required: true
		};

		if (/*attendance*/ ctx[2] !== void 0) {
			input2_props.value = /*attendance*/ ctx[2];
		}

		input2 = new Input({ props: input2_props, $$inline: true });
		binding_callbacks.push(() => bind(input2, 'value', input2_value_binding));

		label3 = new Label({
				props: {
					for: "maxParticipants",
					class: "mb-2",
					$$slots: { default: [create_default_slot_26$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input3_value_binding(value) {
			/*input3_value_binding*/ ctx[14](value);
		}

		let input3_props = {
			type: "number",
			id: "maxParticipants",
			placeholder: "12",
			required: true
		};

		if (/*maxParticipants*/ ctx[3] !== void 0) {
			input3_props.value = /*maxParticipants*/ ctx[3];
		}

		input3 = new Input({ props: input3_props, $$inline: true });
		binding_callbacks.push(() => bind(input3, 'value', input3_value_binding));

		helper = new Helper({
				props: {
					class: "text-sm mt-2",
					$$slots: { default: [create_default_slot_25$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_24$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div4 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				create_component(input0.$$.fragment);
				t2 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t3 = space();
				create_component(input1.$$.fragment);
				t4 = space();
				div2 = element("div");
				create_component(label2.$$.fragment);
				t5 = space();
				create_component(input2.$$.fragment);
				t6 = space();
				div3 = element("div");
				create_component(label3.$$.fragment);
				t7 = space();
				create_component(input3.$$.fragment);
				t8 = space();
				create_component(helper.$$.fragment);
				t9 = space();
				create_component(button.$$.fragment);
				t10 = space();
				create_component(table.$$.fragment);
				add_location(div0, file$7, 101, 12, 2757);
				add_location(div1, file$7, 105, 12, 2975);
				add_location(div2, file$7, 109, 12, 3192);
				add_location(div3, file$7, 113, 12, 3391);
				attr_dev(div4, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div4, file$7, 100, 8, 2700);
				attr_dev(form, "id", "classForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$7, 99, 4, 2585);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div4);
				append_dev(div4, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				mount_component(input0, div0, null);
				append_dev(div4, t2);
				append_dev(div4, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t3);
				mount_component(input1, div1, null);
				append_dev(div4, t4);
				append_dev(div4, div2);
				mount_component(label2, div2, null);
				append_dev(div2, t5);
				mount_component(input2, div2, null);
				append_dev(div4, t6);
				append_dev(div4, div3);
				mount_component(label3, div3, null);
				append_dev(div3, t7);
				mount_component(input3, div3, null);
				append_dev(div3, t8);
				mount_component(helper, div3, null);
				append_dev(form, t9);
				mount_component(button, form, null);
				insert_dev(target, t10, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(form, "submit", prevent_default(/*handleClassesSubmit*/ ctx[6]), false, true, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const heading_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);
				const input0_changes = {};

				if (!updating_value && dirty & /*className*/ 1) {
					updating_value = true;
					input0_changes.value = /*className*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				input0.$set(input0_changes);
				const label1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*scheduleTime*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*scheduleTime*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				input1.$set(input1_changes);
				const label2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label2_changes.$$scope = { dirty, ctx };
				}

				label2.$set(label2_changes);
				const input2_changes = {};

				if (!updating_value_2 && dirty & /*attendance*/ 4) {
					updating_value_2 = true;
					input2_changes.value = /*attendance*/ ctx[2];
					add_flush_callback(() => updating_value_2 = false);
				}

				input2.$set(input2_changes);
				const label3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label3_changes.$$scope = { dirty, ctx };
				}

				label3.$set(label3_changes);
				const input3_changes = {};

				if (!updating_value_3 && dirty & /*maxParticipants*/ 8) {
					updating_value_3 = true;
					input3_changes.value = /*maxParticipants*/ ctx[3];
					add_flush_callback(() => updating_value_3 = false);
				}

				input3.$set(input3_changes);
				const helper_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					helper_changes.$$scope = { dirty, ctx };
				}

				helper.$set(helper_changes);
				const button_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty & /*$$scope, classes, editingClassId*/ 67108912) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(input0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				transition_in(label2.$$.fragment, local);
				transition_in(input2.$$.fragment, local);
				transition_in(label3.$$.fragment, local);
				transition_in(input3.$$.fragment, local);
				transition_in(helper.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(input0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				transition_out(label2.$$.fragment, local);
				transition_out(input2.$$.fragment, local);
				transition_out(label3.$$.fragment, local);
				transition_out(input3.$$.fragment, local);
				transition_out(helper.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t10);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_component(input0);
				destroy_component(label1);
				destroy_component(input1);
				destroy_component(label2);
				destroy_component(input2);
				destroy_component(label3);
				destroy_component(input3);
				destroy_component(helper);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$7.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$7($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Classes', slots, []);
		let className = '';
		let scheduleTime = '';
		let attendance = 0;
		let maxParticipants = 0;
		let classes = [];
		let editingClassId = null;

		// Call fetchClasses on component mount
		onMount(async () => {
			try {
				$$invalidate(4, classes = await fetchClasses());
			} catch(error) {
				console.error('Failed to fetch classes:', error);
			}
		});

		// Function to submit class information
		async function submitClass() {
			const response = await fetch('/api/classes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					className,
					scheduleTime,
					attendance,
					maxParticipants
				})
			});

			if (!response.ok) {
				console.error('Failed to submit class');
				return;
			}

			// After successfully adding a class, re-fetch the classes to update the list
			$$invalidate(4, classes = await fetchClasses());

			// Reset form fields
			$$invalidate(0, className = '');

			$$invalidate(1, scheduleTime = '');
			$$invalidate(2, attendance = 0);
			$$invalidate(3, maxParticipants = 0);
		}

		// Function to handle form submission
		function handleClassesSubmit(event) {
			event.preventDefault();
			submitClass();
		}

		// Function to delete a class
		async function deleteClass(classId) {
			const response = await fetch(`/api/classes/${classId}`, { method: 'DELETE' });

			if (!response.ok) {
				console.error('Failed to delete class');
				return;
			}

			// Re-fetch the classes to update the list after deletion
			$$invalidate(4, classes = await fetchClasses());
		}

		function startEditing(classId) {
			$$invalidate(5, editingClassId = classId);
		}

		function stopEditing() {
			$$invalidate(5, editingClassId = null);
		}

		async function updateClass(classId) {
			const classToUpdate = classes.find(c => c.classId === classId);
			if (!classToUpdate) return;

			const response = await fetch(`/api/classes/${classId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(classToUpdate)
			});

			if (!response.ok) {
				console.error('Failed to update class');
				return;
			}

			$$invalidate(4, classes = await fetchClasses()); // Refresh the class list
			stopEditing(); // Exit edit mode
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$6.warn(`<Classes> was created with unknown prop '${key}'`);
		});

		function input0_value_binding(value) {
			className = value;
			$$invalidate(0, className);
		}

		function input1_value_binding(value) {
			scheduleTime = value;
			$$invalidate(1, scheduleTime);
		}

		function input2_value_binding(value) {
			attendance = value;
			$$invalidate(2, attendance);
		}

		function input3_value_binding(value) {
			maxParticipants = value;
			$$invalidate(3, maxParticipants);
		}

		function input_value_binding(value, classItem) {
			if ($$self.$$.not_equal(classItem.className, value)) {
				classItem.className = value;
				$$invalidate(4, classes);
			}
		}

		function input_value_binding_1(value, classItem) {
			if ($$self.$$.not_equal(classItem.scheduleTime, value)) {
				classItem.scheduleTime = value;
				$$invalidate(4, classes);
			}
		}

		function input_value_binding_2(value, classItem) {
			if ($$self.$$.not_equal(classItem.attendance, value)) {
				classItem.attendance = value;
				$$invalidate(4, classes);
			}
		}

		function input_value_binding_3(value, classItem) {
			if ($$self.$$.not_equal(classItem.maxParticipants, value)) {
				classItem.maxParticipants = value;
				$$invalidate(4, classes);
			}
		}

		const click_handler = classItem => updateClass(classItem.classId);
		const click_handler_1 = classItem => startEditing(classItem.classId);
		const click_handler_2 = classItem => deleteClass(classItem.classId);

		$$self.$capture_state = () => ({
			onMount,
			fetchClasses,
			formatScheduleTime,
			Heading,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Input,
			Helper,
			Button,
			Label,
			className,
			scheduleTime,
			attendance,
			maxParticipants,
			classes,
			editingClassId,
			submitClass,
			handleClassesSubmit,
			deleteClass,
			startEditing,
			stopEditing,
			updateClass
		});

		$$self.$inject_state = $$props => {
			if ('className' in $$props) $$invalidate(0, className = $$props.className);
			if ('scheduleTime' in $$props) $$invalidate(1, scheduleTime = $$props.scheduleTime);
			if ('attendance' in $$props) $$invalidate(2, attendance = $$props.attendance);
			if ('maxParticipants' in $$props) $$invalidate(3, maxParticipants = $$props.maxParticipants);
			if ('classes' in $$props) $$invalidate(4, classes = $$props.classes);
			if ('editingClassId' in $$props) $$invalidate(5, editingClassId = $$props.editingClassId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			className,
			scheduleTime,
			attendance,
			maxParticipants,
			classes,
			editingClassId,
			handleClassesSubmit,
			deleteClass,
			startEditing,
			stopEditing,
			updateClass,
			input0_value_binding,
			input1_value_binding,
			input2_value_binding,
			input3_value_binding,
			input_value_binding,
			input_value_binding_1,
			input_value_binding_2,
			input_value_binding_3,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Classes extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Classes",
				options,
				id: create_fragment$7.name
			});
		}
	}

	// Function to fetch member classes from the backend
	async function fetchMemberClasses() {
	    try {
	        const response = await fetch('/api/memberClasses');
	        if (!response.ok) {
	            throw new Error('Network response was not ok');
	        }
	        const memberClasses = await response.json();
	        return memberClasses;
	    }
	    catch (error) {
	        console.error('There was a problem fetching the member classes:', error);
	        throw error; // Rethrow the error so it can be handled by the caller
	    }
	}

	// Function to fetch members from the backend
	async function fetchMembers() {
	    try {
	        const response = await fetch('/api/members');
	        if (!response.ok) {
	            throw new Error('Network response was not ok');
	        }
	        const members = await response.json();
	        return members;
	    }
	    catch (error) {
	        console.error('There was a problem fetching the members:', error);
	        throw error; // Rethrow the error so it can be handled by the caller
	    }
	}

	/* src/frontend/components/MemberClasses.svelte generated by Svelte v4.2.12 */

	const { Error: Error_1$2, console: console_1$5 } = globals;
	const file$6 = "src/frontend/components/MemberClasses.svelte";

	function get_each_context$5(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[22] = list[i];
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[25] = list[i];
		return child_ctx;
	}

	function get_each_context_2$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[28] = list[i];
		return child_ctx;
	}

	function get_each_context_3$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[25] = list[i];
		return child_ctx;
	}

	function get_each_context_4$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[28] = list[i];
		return child_ctx;
	}

	// (124:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_20$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Register for a class");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20$4.name,
			type: "slot",
			source: "(124:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (128:12) <Label for="memberId" class="mb-2">
	function create_default_slot_19$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Member:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19$4.name,
			type: "slot",
			source: "(128:12) <Label for=\\\"memberId\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (131:16) {#each members as member}
	function create_each_block_4$1(ctx) {
		let option;
		let t_value = /*member*/ ctx[28].memberName + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*member*/ ctx[28].memberId;
				set_input_value(option, option.__value);
				add_location(option, file$6, 148, 20, 4912);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*members*/ 1 && t_value !== (t_value = /*member*/ ctx[28].memberName + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*members*/ 1 && option_value_value !== (option_value_value = /*member*/ ctx[28].memberId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_4$1.name,
			type: "each",
			source: "(131:16) {#each members as member}",
			ctx
		});

		return block;
	}

	// (137:12) <Label for="classId" class="mb-2">
	function create_default_slot_18$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18$4.name,
			type: "slot",
			source: "(137:12) <Label for=\\\"classId\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (140:16) {#each classes as classItem}
	function create_each_block_3$1(ctx) {
		let option;
		let t_value = /*classItem*/ ctx[25].className + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*classItem*/ ctx[25].classId;
				set_input_value(option, option.__value);
				add_location(option, file$6, 157, 20, 5304);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 2 && t_value !== (t_value = /*classItem*/ ctx[25].className + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*classes*/ 2 && option_value_value !== (option_value_value = /*classItem*/ ctx[25].classId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3$1.name,
			type: "each",
			source: "(140:16) {#each classes as classItem}",
			ctx
		});

		return block;
	}

	// (146:12) <Label for="registrationDate" class="mb-2">
	function create_default_slot_17$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Registration Date:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$5.name,
			type: "slot",
			source: "(146:12) <Label for=\\\"registrationDate\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (150:4) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_16$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Register");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$5.name,
			type: "slot",
			source: "(150:4) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (159:8) <TableHeadCell>
	function create_default_slot_15$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Member ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$5.name,
			type: "slot",
			source: "(159:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (160:8) <TableHeadCell>
	function create_default_slot_14$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$5.name,
			type: "slot",
			source: "(160:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (161:8) <TableHeadCell>
	function create_default_slot_13$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Registration Date");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$5.name,
			type: "slot",
			source: "(161:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (162:8) <TableHeadCell>
	function create_default_slot_12$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$5.name,
			type: "slot",
			source: "(162:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (158:4) <TableHead>
	function create_default_slot_11$5(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_15$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_14$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_13$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_12$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$5.name,
			type: "slot",
			source: "(158:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (176:20) {:else}
	function create_else_block_2$2(ctx) {
		let t_value = (/*members*/ ctx[0].find(func)?.memberName || 'Unknown Member') + "";
		let t;

		function func(...args) {
			return /*func*/ ctx[16](/*memberClass*/ ctx[22], ...args);
		}

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*members, memberClasses*/ 33 && t_value !== (t_value = (/*members*/ ctx[0].find(func)?.memberName || 'Unknown Member') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_2$2.name,
			type: "else",
			source: "(176:20) {:else}",
			ctx
		});

		return block;
	}

	// (169:20) {#if editingState.memberClassId === memberClass.memberClassId}
	function create_if_block_2$3(ctx) {
		let select;
		let option;
		let mounted;
		let dispose;
		let each_value_2 = ensure_array_like_dev(/*members*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$2(get_each_context_2$2(ctx, each_value_2, i));
		}

		const block = {
			c: function create() {
				select = element("select");
				option = element("option");
				option.textContent = "Select a member";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$6, 187, 28, 6619);
				if (/*editingState*/ ctx[6].memberId === void 0) add_render_callback(() => /*select_change_handler*/ ctx[15].call(select));
				add_location(select, file$6, 186, 24, 6547);
			},
			m: function mount(target, anchor) {
				insert_dev(target, select, anchor);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*editingState*/ ctx[6].memberId, true);

				if (!mounted) {
					dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[15]);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*members*/ 1) {
					each_value_2 = ensure_array_like_dev(/*members*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2$2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (dirty[0] & /*editingState, members*/ 65) {
					select_option(select, /*editingState*/ ctx[6].memberId);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(select);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$3.name,
			type: "if",
			source: "(169:20) {#if editingState.memberClassId === memberClass.memberClassId}",
			ctx
		});

		return block;
	}

	// (172:28) {#each members as member}
	function create_each_block_2$2(ctx) {
		let option;
		let t_value = /*member*/ ctx[28].memberName + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*member*/ ctx[28].memberId;
				set_input_value(option, option.__value);
				add_location(option, file$6, 189, 32, 6756);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*members*/ 1 && t_value !== (t_value = /*member*/ ctx[28].memberName + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*members*/ 1 && option_value_value !== (option_value_value = /*member*/ ctx[28].memberId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$2.name,
			type: "each",
			source: "(172:28) {#each members as member}",
			ctx
		});

		return block;
	}

	// (168:16) <TableBodyCell>
	function create_default_slot_10$5(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*editingState*/ ctx[6].memberClassId === /*memberClass*/ ctx[22].memberClassId) return create_if_block_2$3;
			return create_else_block_2$2;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$5.name,
			type: "slot",
			source: "(168:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (191:20) {:else}
	function create_else_block_1$5(ctx) {
		let t_value = (/*classes*/ ctx[1].find(func_1)?.className || 'Unknown Class') + "";
		let t;

		function func_1(...args) {
			return /*func_1*/ ctx[18](/*memberClass*/ ctx[22], ...args);
		}

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*classes, memberClasses*/ 34 && t_value !== (t_value = (/*classes*/ ctx[1].find(func_1)?.className || 'Unknown Class') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$5.name,
			type: "else",
			source: "(191:20) {:else}",
			ctx
		});

		return block;
	}

	// (184:20) {#if editingState.memberClassId === memberClass.memberClassId}
	function create_if_block_1$6(ctx) {
		let select;
		let option;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like_dev(/*classes*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				select = element("select");
				option = element("option");
				option.textContent = "Select a class";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$6, 202, 28, 7473);
				if (/*editingState*/ ctx[6].classId === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[17].call(select));
				add_location(select, file$6, 201, 24, 7402);
			},
			m: function mount(target, anchor) {
				insert_dev(target, select, anchor);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*editingState*/ ctx[6].classId, true);

				if (!mounted) {
					dispose = listen_dev(select, "change", /*select_change_handler_1*/ ctx[17]);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 2) {
					each_value_1 = ensure_array_like_dev(/*classes*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}

				if (dirty[0] & /*editingState, members*/ 65) {
					select_option(select, /*editingState*/ ctx[6].classId);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(select);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$6.name,
			type: "if",
			source: "(184:20) {#if editingState.memberClassId === memberClass.memberClassId}",
			ctx
		});

		return block;
	}

	// (187:28) {#each classes as classItem}
	function create_each_block_1$2(ctx) {
		let option;
		let t_value = /*classItem*/ ctx[25].className + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*classItem*/ ctx[25].classId;
				set_input_value(option, option.__value);
				add_location(option, file$6, 204, 32, 7612);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 2 && t_value !== (t_value = /*classItem*/ ctx[25].className + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*classes*/ 2 && option_value_value !== (option_value_value = /*classItem*/ ctx[25].classId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$2.name,
			type: "each",
			source: "(187:28) {#each classes as classItem}",
			ctx
		});

		return block;
	}

	// (183:16) <TableBodyCell>
	function create_default_slot_9$5(ctx) {
		let if_block_anchor;

		function select_block_type_1(ctx, dirty) {
			if (/*editingState*/ ctx[6].memberClassId === /*memberClass*/ ctx[22].memberClassId) return create_if_block_1$6;
			return create_else_block_1$5;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$5.name,
			type: "slot",
			source: "(183:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (198:16) <TableBodyCell>
	function create_default_slot_8$6(ctx) {
		let t_value = formatScheduleTime(/*memberClass*/ ctx[22].registrationDate) + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*memberClasses*/ 32 && t_value !== (t_value = formatScheduleTime(/*memberClass*/ ctx[22].registrationDate) + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$6.name,
			type: "slot",
			source: "(198:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (206:20) {:else}
	function create_else_block$5(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[19](/*memberClass*/ ctx[22]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		function click_handler_1() {
			return /*click_handler_1*/ ctx[20](/*memberClass*/ ctx[22]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_1);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$5.name,
			type: "else",
			source: "(206:20) {:else}",
			ctx
		});

		return block;
	}

	// (202:20) {#if editingState.memberClassId === memberClass.memberClassId}
	function create_if_block$6(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", /*updateMemberClass*/ ctx[7]);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[10]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const button0_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$6.name,
			type: "if",
			source: "(202:20) {#if editingState.memberClassId === memberClass.memberClassId}",
			ctx
		});

		return block;
	}

	// (208:24) <Button color="blue" on:click={() => startEditing(memberClass.memberClassId, memberClass.classId, memberClass.memberId, memberClass.registrationDate)}>
	function create_default_slot_7$6(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$6.name,
			type: "slot",
			source: "(208:24) <Button color=\\\"blue\\\" on:click={() => startEditing(memberClass.memberClassId, memberClass.classId, memberClass.memberId, memberClass.registrationDate)}>",
			ctx
		});

		return block;
	}

	// (209:24) <Button color="red" on:click={() => deleteMemberClass(memberClass.memberClassId)}>
	function create_default_slot_6$6(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$6.name,
			type: "slot",
			source: "(209:24) <Button color=\\\"red\\\" on:click={() => deleteMemberClass(memberClass.memberClassId)}>",
			ctx
		});

		return block;
	}

	// (204:24) <Button color="green" on:click={updateMemberClass}>
	function create_default_slot_5$6(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$6.name,
			type: "slot",
			source: "(204:24) <Button color=\\\"green\\\" on:click={updateMemberClass}>",
			ctx
		});

		return block;
	}

	// (205:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$6(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$6.name,
			type: "slot",
			source: "(205:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (201:16) <TableBodyCell>
	function create_default_slot_3$6(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$6, create_else_block$5];
		const if_blocks = [];

		function select_block_type_2(ctx, dirty) {
			if (/*editingState*/ ctx[6].memberClassId === /*memberClass*/ ctx[22].memberClassId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_2(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_2(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$6.name,
			type: "slot",
			source: "(201:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (166:12) <TableBodyRow>
	function create_default_slot_2$6(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let t3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
				t3 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				insert_dev(target, t3, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty[0] & /*editingState, members, memberClasses*/ 97 | dirty[1] & /*$$scope*/ 16) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty[0] & /*editingState, classes, memberClasses*/ 98 | dirty[1] & /*$$scope*/ 16) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty[0] & /*memberClasses*/ 32 | dirty[1] & /*$$scope*/ 16) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty[0] & /*editingState, memberClasses*/ 96 | dirty[1] & /*$$scope*/ 16) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$6.name,
			type: "slot",
			source: "(166:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (165:8) {#each memberClasses as memberClass}
	function create_each_block$5(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty[0] & /*editingState, memberClasses, classes, members*/ 99 | dirty[1] & /*$$scope*/ 16) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$5.name,
			type: "each",
			source: "(165:8) {#each memberClasses as memberClass}",
			ctx
		});

		return block;
	}

	// (164:4) <TableBody>
	function create_default_slot_1$6(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*memberClasses*/ ctx[5]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*stopEditing, updateMemberClass, editingState, memberClasses, deleteMemberClass, startEditing, classes, members*/ 3811) {
					each_value = ensure_array_like_dev(/*memberClasses*/ ctx[5]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$5(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$5(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$6.name,
			type: "slot",
			source: "(164:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (153:0) <Table class="mt-4">
	function create_default_slot$6(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_11$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Current Registrations\n        ");
				p = element("p");
				p.textContent = "List of current member class registrations.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$6, 172, 8, 5914);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$6, 170, 4, 5766);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty[0] & /*memberClasses, editingState, classes, members*/ 99 | dirty[1] & /*$$scope*/ 16) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$6.name,
			type: "slot",
			source: "(153:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$6(ctx) {
		let heading;
		let t0;
		let form;
		let div3;
		let div0;
		let label0;
		let t1;
		let select0;
		let option0;
		let t3;
		let div1;
		let label1;
		let t4;
		let select1;
		let option1;
		let t6;
		let div2;
		let label2;
		let t7;
		let input;
		let updating_value;
		let t8;
		let button;
		let t9;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_20$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "memberId",
					class: "mb-2",
					$$slots: { default: [create_default_slot_19$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let each_value_4 = ensure_array_like_dev(/*members*/ ctx[0]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_4.length; i += 1) {
			each_blocks_1[i] = create_each_block_4$1(get_each_context_4$1(ctx, each_value_4, i));
		}

		label1 = new Label({
				props: {
					for: "classId",
					class: "mb-2",
					$$slots: { default: [create_default_slot_18$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let each_value_3 = ensure_array_like_dev(/*classes*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value_3.length; i += 1) {
			each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
		}

		label2 = new Label({
				props: {
					for: "registrationDate",
					class: "mb-2",
					$$slots: { default: [create_default_slot_17$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[14](value);
		}

		let input_props = {
			type: "date",
			id: "registrationDate",
			required: true
		};

		if (/*registrationDate*/ ctx[4] !== void 0) {
			input_props.value = /*registrationDate*/ ctx[4];
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_16$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div3 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				select0 = element("select");
				option0 = element("option");
				option0.textContent = "Select a member";

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t3 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t4 = space();
				select1 = element("select");
				option1 = element("option");
				option1.textContent = "Select a class";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t6 = space();
				div2 = element("div");
				create_component(label2.$$.fragment);
				t7 = space();
				create_component(input.$$.fragment);
				t8 = space();
				create_component(button.$$.fragment);
				t9 = space();
				create_component(table.$$.fragment);
				option0.__value = "";
				set_input_value(option0, option0.__value);
				option0.disabled = true;
				add_location(option0, file$6, 146, 16, 4799);
				attr_dev(select0, "id", "memberId");
				select0.required = true;
				if (/*memberId*/ ctx[2] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[12].call(select0));
				add_location(select0, file$6, 145, 12, 4729);
				add_location(div0, file$6, 143, 8, 4648);
				option1.__value = "";
				set_input_value(option1, option1.__value);
				option1.disabled = true;
				add_location(option1, file$6, 155, 16, 5189);
				attr_dev(select1, "id", "classId");
				select1.required = true;
				if (/*classId*/ ctx[3] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[13].call(select1));
				add_location(select1, file$6, 154, 12, 5121);
				add_location(div1, file$6, 152, 8, 5042);
				add_location(div2, file$6, 161, 8, 5438);
				attr_dev(div3, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div3, file$6, 142, 4, 4595);
				attr_dev(form, "id", "memberClassForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$6, 141, 0, 4472);
			},
			l: function claim(nodes) {
				throw new Error_1$2("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div3);
				append_dev(div3, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				append_dev(div0, select0);
				append_dev(select0, option0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(select0, null);
					}
				}

				select_option(select0, /*memberId*/ ctx[2], true);
				append_dev(div3, t3);
				append_dev(div3, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t4);
				append_dev(div1, select1);
				append_dev(select1, option1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select1, null);
					}
				}

				select_option(select1, /*classId*/ ctx[3], true);
				append_dev(div3, t6);
				append_dev(div3, div2);
				mount_component(label2, div2, null);
				append_dev(div2, t7);
				mount_component(input, div2, null);
				append_dev(form, t8);
				mount_component(button, form, null);
				insert_dev(target, t9, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(select0, "change", /*select0_change_handler*/ ctx[12]),
						listen_dev(select1, "change", /*select1_change_handler*/ ctx[13]),
						listen_dev(form, "submit", prevent_default(/*handleMemberClassesSubmit*/ ctx[8]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				const heading_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);

				if (dirty[0] & /*members*/ 1) {
					each_value_4 = ensure_array_like_dev(/*members*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_4.length; i += 1) {
						const child_ctx = get_each_context_4$1(ctx, each_value_4, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_4$1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(select0, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_4.length;
				}

				if (dirty[0] & /*memberId, members*/ 5) {
					select_option(select0, /*memberId*/ ctx[2]);
				}

				const label1_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);

				if (dirty[0] & /*classes*/ 2) {
					each_value_3 = ensure_array_like_dev(/*classes*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_3.length; i += 1) {
						const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_3$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_3.length;
				}

				if (dirty[0] & /*classId, classes*/ 10) {
					select_option(select1, /*classId*/ ctx[3]);
				}

				const label2_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					label2_changes.$$scope = { dirty, ctx };
				}

				label2.$set(label2_changes);
				const input_changes = {};

				if (!updating_value && dirty[0] & /*registrationDate*/ 16) {
					updating_value = true;
					input_changes.value = /*registrationDate*/ ctx[4];
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
				const button_changes = {};

				if (dirty[1] & /*$$scope*/ 16) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty[0] & /*memberClasses, editingState, classes, members*/ 99 | dirty[1] & /*$$scope*/ 16) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(label2.$$.fragment, local);
				transition_in(input.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(label2.$$.fragment, local);
				transition_out(input.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t9);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_each(each_blocks_1, detaching);
				destroy_component(label1);
				destroy_each(each_blocks, detaching);
				destroy_component(label2);
				destroy_component(input);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$6.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('MemberClasses', slots, []);
		let members = [];
		let classes = [];
		let memberId = 0;
		let classId = 0;
		let registrationDate = '';
		let memberClasses = [];

		let editingState = {
			memberClassId: null,
			classId: null,
			memberId: null,
			registrationDate: null
		};

		// Fetch member classes on component mount
		onMount(async () => {
			try {
				$$invalidate(0, [members, classes, memberClasses] = await Promise.all([fetchMembers(), fetchClasses(), fetchMemberClasses()]), members, $$invalidate(1, classes), $$invalidate(5, memberClasses));
			} catch(error) {
				console.error('Failed to fetch data:', error);
			}
		});

		async function submitMemberClass() {
			// Validation: Check if all required fields are filled
			if (!memberId || !classId || !registrationDate) {
				console.error('All fields are required');
				return;
			}

			try {
				// Sending the POST request to the server
				const response = await fetch('/api/memberClasses', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ memberId, classId, registrationDate })
				});

				if (!response.ok) {
					// Handling responses that are not 2xx
					throw new Error('Network response was not ok');
				}

				// Processing the successful response
				const result = await response.json();

				console.log('Member class registration successful:', result);

				// Resetting form fields after successful submission
				$$invalidate(2, memberId = 0);

				$$invalidate(3, classId = 0);
				$$invalidate(4, registrationDate = '');

				// Refreshing the list of member classes to include the new registration
				$$invalidate(5, memberClasses = await fetchMemberClasses());
			} catch(error) {
				// Handling any errors that occurred during the fetch operation
				console.error('Failed to submit member class:', error);
			}
		}

		// Function to handle editing of member classes
		async function updateMemberClass() {
			if (!editingState.memberClassId) {
				console.error('Member class ID is required');
				return;
			}

			try {
				const response = await fetch(`/api/memberClasses/${editingState.memberClassId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						memberId: editingState.memberId,
						classId: editingState.classId,
						registrationDate: editingState.registrationDate
					})
				});

				if (!response.ok) {
					throw new Error('Network response was not ok');
				}

				console.log('Member class update successful');
				stopEditing(); // Reset editing state
				$$invalidate(5, memberClasses = await fetchMemberClasses()); // Refresh list
			} catch(error) {
				console.error('Failed to update member class:', error);
			}
		}

		function handleMemberClassesSubmit(event) {
			event.preventDefault();
			submitMemberClass();
		}

		function startEditing(memberClassId, classId, memberId, registrationDate) {
			$$invalidate(6, editingState = {
				memberClassId,
				classId,
				memberId,
				registrationDate
			});
		}

		// Function to stop editing
		function stopEditing() {
			$$invalidate(6, editingState = {
				memberClassId: null,
				classId: null,
				memberId: null,
				registrationDate: null
			});
		}

		// Function to delete a member class registration
		async function deleteMemberClass(memberClassId) {
			try {
				const response = await fetch(`/api/memberClasses/${memberClassId}`, { method: 'DELETE' });

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Network response was not ok');
				}

				console.log('Member class deleted successfully');
				$$invalidate(5, memberClasses = await fetchMemberClasses()); // Refresh list
			} catch(error) {
				console.error('Failed to delete member class:', error);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<MemberClasses> was created with unknown prop '${key}'`);
		});

		function select0_change_handler() {
			memberId = select_value(this);
			$$invalidate(2, memberId);
			$$invalidate(0, members);
		}

		function select1_change_handler() {
			classId = select_value(this);
			$$invalidate(3, classId);
			$$invalidate(1, classes);
		}

		function input_value_binding(value) {
			registrationDate = value;
			$$invalidate(4, registrationDate);
		}

		function select_change_handler() {
			editingState.memberId = select_value(this);
			$$invalidate(6, editingState);
			$$invalidate(0, members);
		}

		const func = (memberClass, m) => m.memberId === memberClass.memberId;

		function select_change_handler_1() {
			editingState.classId = select_value(this);
			$$invalidate(6, editingState);
			$$invalidate(0, members);
		}

		const func_1 = (memberClass, c) => c.classId === memberClass.classId;
		const click_handler = memberClass => startEditing(memberClass.memberClassId, memberClass.classId, memberClass.memberId, memberClass.registrationDate);
		const click_handler_1 = memberClass => deleteMemberClass(memberClass.memberClassId);

		$$self.$capture_state = () => ({
			onMount,
			Heading,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Input,
			Helper,
			Button,
			Label,
			fetchMemberClasses,
			fetchClasses,
			fetchMembers,
			formatScheduleTime,
			members,
			classes,
			memberId,
			classId,
			registrationDate,
			memberClasses,
			editingState,
			submitMemberClass,
			updateMemberClass,
			handleMemberClassesSubmit,
			startEditing,
			stopEditing,
			deleteMemberClass
		});

		$$self.$inject_state = $$props => {
			if ('members' in $$props) $$invalidate(0, members = $$props.members);
			if ('classes' in $$props) $$invalidate(1, classes = $$props.classes);
			if ('memberId' in $$props) $$invalidate(2, memberId = $$props.memberId);
			if ('classId' in $$props) $$invalidate(3, classId = $$props.classId);
			if ('registrationDate' in $$props) $$invalidate(4, registrationDate = $$props.registrationDate);
			if ('memberClasses' in $$props) $$invalidate(5, memberClasses = $$props.memberClasses);
			if ('editingState' in $$props) $$invalidate(6, editingState = $$props.editingState);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			members,
			classes,
			memberId,
			classId,
			registrationDate,
			memberClasses,
			editingState,
			updateMemberClass,
			handleMemberClassesSubmit,
			startEditing,
			stopEditing,
			deleteMemberClass,
			select0_change_handler,
			select1_change_handler,
			input_value_binding,
			select_change_handler,
			func,
			select_change_handler_1,
			func_1,
			click_handler,
			click_handler_1
		];
	}

	class MemberClasses extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "MemberClasses",
				options,
				id: create_fragment$6.name
			});
		}
	}

	// Function to fetch equipment from the backend
	async function fetchEquipment() {
	    try {
	        const response = await fetch('/api/equipment');
	        if (!response.ok) {
	            console.error('Failed to fetch equipment');
	            return [];
	        }
	        const equipment = await response.json();
	        return equipment;
	    }
	    catch (error) {
	        console.error('Error fetching equipment:', error);
	        return [];
	    }
	}

	/* src/frontend/components/Equipment.svelte generated by Svelte v4.2.12 */

	const { console: console_1$4 } = globals;
	const file$5 = "src/frontend/components/Equipment.svelte";

	function get_each_context$4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		child_ctx[24] = list;
		child_ctx[25] = i;
		return child_ctx;
	}

	// (83:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_30(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Add or edit equipemnt");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_30.name,
			type: "slot",
			source: "(83:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (87:12) <Label for="equipmentType" class="mb-2">
	function create_default_slot_29$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Equipment Type:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_29$1.name,
			type: "slot",
			source: "(87:12) <Label for=\\\"equipmentType\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (91:12) <Label for="purchaseDate" class="mb-2">
	function create_default_slot_28$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Purchase Date:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_28$1.name,
			type: "slot",
			source: "(91:12) <Label for=\\\"purchaseDate\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (95:12) <Label for="maintenanceSchedule" class="mb-2">
	function create_default_slot_27$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Maintenance Schedule:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_27$1.name,
			type: "slot",
			source: "(95:12) <Label for=\\\"maintenanceSchedule\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (97:12) <Helper class="text-sm mt-2">
	function create_default_slot_26$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Optional. Specify if there's a regular maintenance schedule.");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_26$2.name,
			type: "slot",
			source: "(97:12) <Helper class=\\\"text-sm mt-2\\\">",
			ctx
		});

		return block;
	}

	// (102:12) <Label for="lifespan" class="mb-2">
	function create_default_slot_25$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Lifespan (Years):");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_25$2.name,
			type: "slot",
			source: "(102:12) <Label for=\\\"lifespan\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (104:12) <Helper class="text-sm mt-2">
	function create_default_slot_24$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Optional. Expected number of years the equipment will be in service.");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_24$2.name,
			type: "slot",
			source: "(104:12) <Helper class=\\\"text-sm mt-2\\\">",
			ctx
		});

		return block;
	}

	// (109:4) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_23$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Submit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_23$2.name,
			type: "slot",
			source: "(109:4) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (118:12) <TableHeadCell>
	function create_default_slot_22$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Equipment ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_22$2.name,
			type: "slot",
			source: "(118:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (119:12) <TableHeadCell>
	function create_default_slot_21$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Equipment Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_21$3.name,
			type: "slot",
			source: "(119:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (120:12) <TableHeadCell>
	function create_default_slot_20$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Purchase Date");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20$3.name,
			type: "slot",
			source: "(120:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (121:12) <TableHeadCell>
	function create_default_slot_19$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Maintenance Schedule");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19$3.name,
			type: "slot",
			source: "(121:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (122:12) <TableHeadCell>
	function create_default_slot_18$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Lifespan");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18$3.name,
			type: "slot",
			source: "(122:12) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (117:4) <TableHead>
	function create_default_slot_17$4(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let t3;
		let tableheadcell4;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_22$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_21$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_20$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_19$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell4 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_18$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
				t3 = space();
				create_component(tableheadcell4.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tableheadcell4, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
				const tableheadcell4_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell4_changes.$$scope = { dirty, ctx };
				}

				tableheadcell4.$set(tableheadcell4_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				transition_in(tableheadcell4.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				transition_out(tableheadcell4.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
				destroy_component(tableheadcell4, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$4.name,
			type: "slot",
			source: "(117:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (127:16) <TableBodyCell>
	function create_default_slot_16$4(ctx) {
		let t_value = /*item*/ ctx[23].equipmentId + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 16 && t_value !== (t_value = /*item*/ ctx[23].equipmentId + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$4.name,
			type: "slot",
			source: "(127:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (133:16) {:else}
	function create_else_block_1$4(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_15$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_14$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_13$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_12$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$4.name,
			type: "else",
			source: "(133:16) {:else}",
			ctx
		});

		return block;
	}

	// (128:16) {#if editingEquipmentId === item.equipmentId}
	function create_if_block_1$5(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_11$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$5.name,
			type: "if",
			source: "(128:16) {#if editingEquipmentId === item.equipmentId}",
			ctx
		});

		return block;
	}

	// (134:20) <TableBodyCell>
	function create_default_slot_15$4(ctx) {
		let t_value = /*item*/ ctx[23].equipmentType + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 16 && t_value !== (t_value = /*item*/ ctx[23].equipmentType + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$4.name,
			type: "slot",
			source: "(134:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (135:20) <TableBodyCell>
	function create_default_slot_14$4(ctx) {
		let t_value = formatScheduleTime(/*item*/ ctx[23].purchaseDate) + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 16 && t_value !== (t_value = formatScheduleTime(/*item*/ ctx[23].purchaseDate) + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$4.name,
			type: "slot",
			source: "(135:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (136:20) <TableBodyCell>
	function create_default_slot_13$4(ctx) {
		let t_value = /*item*/ ctx[23].maintenanceSchedule + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 16 && t_value !== (t_value = /*item*/ ctx[23].maintenanceSchedule + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$4.name,
			type: "slot",
			source: "(136:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (137:20) <TableBodyCell>
	function create_default_slot_12$4(ctx) {
		let t_value = /*item*/ ctx[23].lifespan + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 16 && t_value !== (t_value = /*item*/ ctx[23].lifespan + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$4.name,
			type: "slot",
			source: "(137:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (129:20) <TableBodyCell>
	function create_default_slot_11$4(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[15](value, /*item*/ ctx[23]);
		}

		let input_props = { type: "text" };

		if (/*item*/ ctx[23].equipmentType !== void 0) {
			input_props.value = /*item*/ ctx[23].equipmentType;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*equipment*/ 16) {
					updating_value = true;
					input_changes.value = /*item*/ ctx[23].equipmentType;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$4.name,
			type: "slot",
			source: "(129:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (130:20) <TableBodyCell>
	function create_default_slot_10$4(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_1(value) {
			/*input_value_binding_1*/ ctx[16](value, /*item*/ ctx[23]);
		}

		let input_props = { type: "date" };

		if (/*item*/ ctx[23].purchaseDate !== void 0) {
			input_props.value = /*item*/ ctx[23].purchaseDate;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*equipment*/ 16) {
					updating_value = true;
					input_changes.value = /*item*/ ctx[23].purchaseDate;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$4.name,
			type: "slot",
			source: "(130:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (131:20) <TableBodyCell>
	function create_default_slot_9$4(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_2(value) {
			/*input_value_binding_2*/ ctx[17](value, /*item*/ ctx[23]);
		}

		let input_props = { type: "text" };

		if (/*item*/ ctx[23].maintenanceSchedule !== void 0) {
			input_props.value = /*item*/ ctx[23].maintenanceSchedule;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_2));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*equipment*/ 16) {
					updating_value = true;
					input_changes.value = /*item*/ ctx[23].maintenanceSchedule;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$4.name,
			type: "slot",
			source: "(131:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (132:20) <TableBodyCell>
	function create_default_slot_8$5(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_3(value) {
			/*input_value_binding_3*/ ctx[18](value, /*item*/ ctx[23]);
		}

		let input_props = { type: "number" };

		if (/*item*/ ctx[23].lifespan !== void 0) {
			input_props.value = /*item*/ ctx[23].lifespan;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_3));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*equipment*/ 16) {
					updating_value = true;
					input_changes.value = /*item*/ ctx[23].lifespan;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$5.name,
			type: "slot",
			source: "(132:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (143:20) {:else}
	function create_else_block$4(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[20](/*item*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler_1);

		function click_handler_2() {
			return /*click_handler_2*/ ctx[21](/*item*/ ctx[23]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_2);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$4.name,
			type: "else",
			source: "(143:20) {:else}",
			ctx
		});

		return block;
	}

	// (140:20) {#if editingEquipmentId === item.equipmentId}
	function create_if_block$5(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[19](/*item*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[9]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$5.name,
			type: "if",
			source: "(140:20) {#if editingEquipmentId === item.equipmentId}",
			ctx
		});

		return block;
	}

	// (144:24) <Button color="blue" on:click={() => startEditing(item.equipmentId)}>
	function create_default_slot_7$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$5.name,
			type: "slot",
			source: "(144:24) <Button color=\\\"blue\\\" on:click={() => startEditing(item.equipmentId)}>",
			ctx
		});

		return block;
	}

	// (145:24) <Button color="red" on:click={() => deleteEquipment(item.equipmentId)}>
	function create_default_slot_6$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$5.name,
			type: "slot",
			source: "(145:24) <Button color=\\\"red\\\" on:click={() => deleteEquipment(item.equipmentId)}>",
			ctx
		});

		return block;
	}

	// (141:24) <Button color="green" on:click={() => updateEquipment(item.equipmentId)}>
	function create_default_slot_5$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$5.name,
			type: "slot",
			source: "(141:24) <Button color=\\\"green\\\" on:click={() => updateEquipment(item.equipmentId)}>",
			ctx
		});

		return block;
	}

	// (142:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$5(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$5.name,
			type: "slot",
			source: "(142:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (139:16) <TableBodyCell>
	function create_default_slot_3$5(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$5, create_else_block$4];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*editingEquipmentId*/ ctx[5] === /*item*/ ctx[23].equipmentId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$5.name,
			type: "slot",
			source: "(139:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (126:12) <TableBodyRow>
	function create_default_slot_2$5(ctx) {
		let tablebodycell0;
		let t0;
		let current_block_type_index;
		let if_block;
		let t1;
		let tablebodycell1;
		let t2;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_16$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const if_block_creators = [create_if_block_1$5, create_else_block_1$4];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*editingEquipmentId*/ ctx[5] === /*item*/ ctx[23].equipmentId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				if_block.c();
				t1 = space();
				create_component(tablebodycell1.$$.fragment);
				t2 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t2, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, equipment*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(t1.parentNode, t1);
				}

				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, equipment, editingEquipmentId*/ 67108912) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(if_block);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(if_block);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				if_blocks[current_block_type_index].d(detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$5.name,
			type: "slot",
			source: "(126:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (125:8) {#each equipment as item}
	function create_each_block$4(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty & /*$$scope, equipment, editingEquipmentId*/ 67108912) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$4.name,
			type: "each",
			source: "(125:8) {#each equipment as item}",
			ctx
		});

		return block;
	}

	// (124:4) <TableBody>
	function create_default_slot_1$5(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*equipment*/ ctx[4]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*stopEditing, updateEquipment, equipment, editingEquipmentId, deleteEquipment, startEditing*/ 1968) {
					each_value = ensure_array_like_dev(/*equipment*/ ctx[4]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$4(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$4(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$5.name,
			type: "slot",
			source: "(124:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (112:0) <Table class="mt-4">
	function create_default_slot$5(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_17$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Gym Equipment\n        ");
				p = element("p");
				p.textContent = "Here is a list of the current equipment in the gym.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$5, 131, 8, 4202);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$5, 129, 4, 4062);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty & /*$$scope, equipment, editingEquipmentId*/ 67108912) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$5.name,
			type: "slot",
			source: "(112:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$5(ctx) {
		let heading;
		let t0;
		let form;
		let div4;
		let div0;
		let label0;
		let t1;
		let input0;
		let updating_value;
		let t2;
		let div1;
		let label1;
		let t3;
		let input1;
		let updating_value_1;
		let t4;
		let div2;
		let label2;
		let t5;
		let input2;
		let updating_value_2;
		let t6;
		let helper0;
		let t7;
		let div3;
		let label3;
		let t8;
		let input3;
		let updating_value_3;
		let t9;
		let helper1;
		let t10;
		let button;
		let t11;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_30] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "equipmentType",
					class: "mb-2",
					$$slots: { default: [create_default_slot_29$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[11](value);
		}

		let input0_props = {
			type: "text",
			id: "equipmentType",
			placeholder: "i.e. Treadmill",
			required: true
		};

		if (/*equipmentType*/ ctx[0] !== void 0) {
			input0_props.value = /*equipmentType*/ ctx[0];
		}

		input0 = new Input({ props: input0_props, $$inline: true });
		binding_callbacks.push(() => bind(input0, 'value', input0_value_binding));

		label1 = new Label({
				props: {
					for: "purchaseDate",
					class: "mb-2",
					$$slots: { default: [create_default_slot_28$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[12](value);
		}

		let input1_props = {
			type: "date",
			id: "purchaseDate",
			required: true
		};

		if (/*purchaseDate*/ ctx[1] !== void 0) {
			input1_props.value = /*purchaseDate*/ ctx[1];
		}

		input1 = new Input({ props: input1_props, $$inline: true });
		binding_callbacks.push(() => bind(input1, 'value', input1_value_binding));

		label2 = new Label({
				props: {
					for: "maintenanceSchedule",
					class: "mb-2",
					$$slots: { default: [create_default_slot_27$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input2_value_binding(value) {
			/*input2_value_binding*/ ctx[13](value);
		}

		let input2_props = {
			type: "text",
			id: "maintenanceSchedule",
			placeholder: "i.e. Monthly"
		};

		if (/*maintenanceSchedule*/ ctx[2] !== void 0) {
			input2_props.value = /*maintenanceSchedule*/ ctx[2];
		}

		input2 = new Input({ props: input2_props, $$inline: true });
		binding_callbacks.push(() => bind(input2, 'value', input2_value_binding));

		helper0 = new Helper({
				props: {
					class: "text-sm mt-2",
					$$slots: { default: [create_default_slot_26$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label3 = new Label({
				props: {
					for: "lifespan",
					class: "mb-2",
					$$slots: { default: [create_default_slot_25$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input3_value_binding(value) {
			/*input3_value_binding*/ ctx[14](value);
		}

		let input3_props = {
			type: "number",
			id: "lifespan",
			placeholder: "5"
		};

		if (/*lifespan*/ ctx[3] !== void 0) {
			input3_props.value = /*lifespan*/ ctx[3];
		}

		input3 = new Input({ props: input3_props, $$inline: true });
		binding_callbacks.push(() => bind(input3, 'value', input3_value_binding));

		helper1 = new Helper({
				props: {
					class: "text-sm mt-2",
					$$slots: { default: [create_default_slot_24$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_23$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div4 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				create_component(input0.$$.fragment);
				t2 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t3 = space();
				create_component(input1.$$.fragment);
				t4 = space();
				div2 = element("div");
				create_component(label2.$$.fragment);
				t5 = space();
				create_component(input2.$$.fragment);
				t6 = space();
				create_component(helper0.$$.fragment);
				t7 = space();
				div3 = element("div");
				create_component(label3.$$.fragment);
				t8 = space();
				create_component(input3.$$.fragment);
				t9 = space();
				create_component(helper1.$$.fragment);
				t10 = space();
				create_component(button.$$.fragment);
				t11 = space();
				create_component(table.$$.fragment);
				add_location(div0, file$5, 102, 8, 2813);
				add_location(div1, file$5, 106, 8, 3036);
				add_location(div2, file$5, 110, 8, 3226);
				add_location(div3, file$5, 117, 8, 3603);
				attr_dev(div4, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div4, file$5, 101, 4, 2760);
				attr_dev(form, "id", "equipmentForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$5, 100, 0, 2643);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div4);
				append_dev(div4, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				mount_component(input0, div0, null);
				append_dev(div4, t2);
				append_dev(div4, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t3);
				mount_component(input1, div1, null);
				append_dev(div4, t4);
				append_dev(div4, div2);
				mount_component(label2, div2, null);
				append_dev(div2, t5);
				mount_component(input2, div2, null);
				append_dev(div2, t6);
				mount_component(helper0, div2, null);
				append_dev(div4, t7);
				append_dev(div4, div3);
				mount_component(label3, div3, null);
				append_dev(div3, t8);
				mount_component(input3, div3, null);
				append_dev(div3, t9);
				mount_component(helper1, div3, null);
				append_dev(form, t10);
				mount_component(button, form, null);
				insert_dev(target, t11, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(form, "submit", prevent_default(/*handleEquipmentSubmit*/ ctx[6]), false, true, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const heading_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);
				const input0_changes = {};

				if (!updating_value && dirty & /*equipmentType*/ 1) {
					updating_value = true;
					input0_changes.value = /*equipmentType*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				input0.$set(input0_changes);
				const label1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*purchaseDate*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*purchaseDate*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				input1.$set(input1_changes);
				const label2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label2_changes.$$scope = { dirty, ctx };
				}

				label2.$set(label2_changes);
				const input2_changes = {};

				if (!updating_value_2 && dirty & /*maintenanceSchedule*/ 4) {
					updating_value_2 = true;
					input2_changes.value = /*maintenanceSchedule*/ ctx[2];
					add_flush_callback(() => updating_value_2 = false);
				}

				input2.$set(input2_changes);
				const helper0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					helper0_changes.$$scope = { dirty, ctx };
				}

				helper0.$set(helper0_changes);
				const label3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label3_changes.$$scope = { dirty, ctx };
				}

				label3.$set(label3_changes);
				const input3_changes = {};

				if (!updating_value_3 && dirty & /*lifespan*/ 8) {
					updating_value_3 = true;
					input3_changes.value = /*lifespan*/ ctx[3];
					add_flush_callback(() => updating_value_3 = false);
				}

				input3.$set(input3_changes);
				const helper1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					helper1_changes.$$scope = { dirty, ctx };
				}

				helper1.$set(helper1_changes);
				const button_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty & /*$$scope, equipment, editingEquipmentId*/ 67108912) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(input0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				transition_in(label2.$$.fragment, local);
				transition_in(input2.$$.fragment, local);
				transition_in(helper0.$$.fragment, local);
				transition_in(label3.$$.fragment, local);
				transition_in(input3.$$.fragment, local);
				transition_in(helper1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(input0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				transition_out(label2.$$.fragment, local);
				transition_out(input2.$$.fragment, local);
				transition_out(helper0.$$.fragment, local);
				transition_out(label3.$$.fragment, local);
				transition_out(input3.$$.fragment, local);
				transition_out(helper1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t11);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_component(input0);
				destroy_component(label1);
				destroy_component(input1);
				destroy_component(label2);
				destroy_component(input2);
				destroy_component(helper0);
				destroy_component(label3);
				destroy_component(input3);
				destroy_component(helper1);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$5.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Equipment', slots, []);
		let equipmentType = '';
		let purchaseDate = '';
		let maintenanceSchedule = '';
		let lifespan;
		let equipment = [];
		let editingEquipmentId = null;

		onMount(async () => {
			try {
				$$invalidate(4, equipment = await fetchEquipment());
			} catch(error) {
				console.error('Failed to fetch equipment:', error);
			}
		});

		async function submitEquipment() {
			const response = await fetch('/api/equipment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					equipmentType,
					purchaseDate,
					maintenanceSchedule,
					lifespan
				})
			});

			if (!response.ok) {
				console.error('Failed to submit equipment');
				return;
			}

			// After successfully adding equipment, re-fetch the equipment list to update the UI
			$$invalidate(4, equipment = await fetchEquipment());

			// Reset form fields
			$$invalidate(0, equipmentType = '');

			$$invalidate(1, purchaseDate = '');
			$$invalidate(2, maintenanceSchedule = '');
			$$invalidate(3, lifespan = undefined);
		}

		function handleEquipmentSubmit(event) {
			event.preventDefault();
			submitEquipment();
		}

		async function deleteEquipment(equipmentId) {
			const response = await fetch(`/api/equipment/${equipmentId}`, { method: 'DELETE' });

			if (!response.ok) {
				console.error('Failed to delete equipment');
				return;
			}

			// Re-fetch the equipment to update the list after deletion
			$$invalidate(4, equipment = await fetchEquipment());
		}

		function startEditing(equipmentId) {
			$$invalidate(5, editingEquipmentId = equipmentId);
		}

		function stopEditing() {
			$$invalidate(5, editingEquipmentId = null);
		}

		async function updateEquipment(equipmentId) {
			const equipmentToUpdate = equipment.find(e => e.equipmentId === editingEquipmentId);
			if (!equipmentToUpdate) return;

			const response = await fetch(`/api/equipment/${equipmentId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(equipmentToUpdate)
			});

			if (!response.ok) {
				console.error('Failed to update equipment');
				return;
			}

			// After successfully updating the equipment, re-fetch the equipment list to update the UI
			$$invalidate(4, equipment = await fetchEquipment());

			// Exit editing mode
			stopEditing();
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<Equipment> was created with unknown prop '${key}'`);
		});

		function input0_value_binding(value) {
			equipmentType = value;
			$$invalidate(0, equipmentType);
		}

		function input1_value_binding(value) {
			purchaseDate = value;
			$$invalidate(1, purchaseDate);
		}

		function input2_value_binding(value) {
			maintenanceSchedule = value;
			$$invalidate(2, maintenanceSchedule);
		}

		function input3_value_binding(value) {
			lifespan = value;
			$$invalidate(3, lifespan);
		}

		function input_value_binding(value, item) {
			if ($$self.$$.not_equal(item.equipmentType, value)) {
				item.equipmentType = value;
				$$invalidate(4, equipment);
			}
		}

		function input_value_binding_1(value, item) {
			if ($$self.$$.not_equal(item.purchaseDate, value)) {
				item.purchaseDate = value;
				$$invalidate(4, equipment);
			}
		}

		function input_value_binding_2(value, item) {
			if ($$self.$$.not_equal(item.maintenanceSchedule, value)) {
				item.maintenanceSchedule = value;
				$$invalidate(4, equipment);
			}
		}

		function input_value_binding_3(value, item) {
			if ($$self.$$.not_equal(item.lifespan, value)) {
				item.lifespan = value;
				$$invalidate(4, equipment);
			}
		}

		const click_handler = item => updateEquipment(item.equipmentId);
		const click_handler_1 = item => startEditing(item.equipmentId);
		const click_handler_2 = item => deleteEquipment(item.equipmentId);

		$$self.$capture_state = () => ({
			onMount,
			Button,
			Input,
			Label,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Helper,
			Heading,
			fetchEquipment,
			formatScheduleTime,
			equipmentType,
			purchaseDate,
			maintenanceSchedule,
			lifespan,
			equipment,
			editingEquipmentId,
			submitEquipment,
			handleEquipmentSubmit,
			deleteEquipment,
			startEditing,
			stopEditing,
			updateEquipment
		});

		$$self.$inject_state = $$props => {
			if ('equipmentType' in $$props) $$invalidate(0, equipmentType = $$props.equipmentType);
			if ('purchaseDate' in $$props) $$invalidate(1, purchaseDate = $$props.purchaseDate);
			if ('maintenanceSchedule' in $$props) $$invalidate(2, maintenanceSchedule = $$props.maintenanceSchedule);
			if ('lifespan' in $$props) $$invalidate(3, lifespan = $$props.lifespan);
			if ('equipment' in $$props) $$invalidate(4, equipment = $$props.equipment);
			if ('editingEquipmentId' in $$props) $$invalidate(5, editingEquipmentId = $$props.editingEquipmentId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			equipmentType,
			purchaseDate,
			maintenanceSchedule,
			lifespan,
			equipment,
			editingEquipmentId,
			handleEquipmentSubmit,
			deleteEquipment,
			startEditing,
			stopEditing,
			updateEquipment,
			input0_value_binding,
			input1_value_binding,
			input2_value_binding,
			input3_value_binding,
			input_value_binding,
			input_value_binding_1,
			input_value_binding_2,
			input_value_binding_3,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Equipment extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Equipment",
				options,
				id: create_fragment$5.name
			});
		}
	}

	/* src/frontend/components/Members.svelte generated by Svelte v4.2.12 */

	const { console: console_1$3 } = globals;
	const file$4 = "src/frontend/components/Members.svelte";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		child_ctx[24] = list;
		child_ctx[25] = i;
		return child_ctx;
	}

	// (82:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_29(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Add or edit a member");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_29.name,
			type: "slot",
			source: "(82:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (86:12) <Label for="memberName" class="mb-2">
	function create_default_slot_28(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Member Name:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_28.name,
			type: "slot",
			source: "(86:12) <Label for=\\\"memberName\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (90:12) <Label for="email" class="mb-2">
	function create_default_slot_27(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Email:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_27.name,
			type: "slot",
			source: "(90:12) <Label for=\\\"email\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (94:12) <Label for="dateJoined" class="mb-2">
	function create_default_slot_26$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Date Joined:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_26$1.name,
			type: "slot",
			source: "(94:12) <Label for=\\\"dateJoined\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (98:12) <Label for="membershipType" class="mb-2">
	function create_default_slot_25$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Membership Type:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_25$1.name,
			type: "slot",
			source: "(98:12) <Label for=\\\"membershipType\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (102:4) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_24$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Submit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_24$1.name,
			type: "slot",
			source: "(102:4) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (110:8) <TableHeadCell>
	function create_default_slot_23$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Member ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_23$1.name,
			type: "slot",
			source: "(110:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (111:8) <TableHeadCell>
	function create_default_slot_22$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_22$1.name,
			type: "slot",
			source: "(111:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (112:8) <TableHeadCell>
	function create_default_slot_21$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Email");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_21$2.name,
			type: "slot",
			source: "(112:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (113:8) <TableHeadCell>
	function create_default_slot_20$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Date Joined");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20$2.name,
			type: "slot",
			source: "(113:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (114:8) <TableHeadCell>
	function create_default_slot_19$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Membership Type");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19$2.name,
			type: "slot",
			source: "(114:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (115:8) <TableHeadCell>
	function create_default_slot_18$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18$2.name,
			type: "slot",
			source: "(115:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (109:4) <TableHead>
	function create_default_slot_17$3(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let t3;
		let tableheadcell4;
		let t4;
		let tableheadcell5;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_23$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_22$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_21$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_20$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell4 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_19$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell5 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_18$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
				t3 = space();
				create_component(tableheadcell4.$$.fragment);
				t4 = space();
				create_component(tableheadcell5.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tableheadcell4, target, anchor);
				insert_dev(target, t4, anchor);
				mount_component(tableheadcell5, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
				const tableheadcell4_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell4_changes.$$scope = { dirty, ctx };
				}

				tableheadcell4.$set(tableheadcell4_changes);
				const tableheadcell5_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tableheadcell5_changes.$$scope = { dirty, ctx };
				}

				tableheadcell5.$set(tableheadcell5_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				transition_in(tableheadcell4.$$.fragment, local);
				transition_in(tableheadcell5.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				transition_out(tableheadcell4.$$.fragment, local);
				transition_out(tableheadcell5.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
				destroy_component(tableheadcell4, detaching);
				destroy_component(tableheadcell5, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$3.name,
			type: "slot",
			source: "(109:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (120:16) <TableBodyCell>
	function create_default_slot_16$3(ctx) {
		let t_value = /*member*/ ctx[23].memberId + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*members*/ 16 && t_value !== (t_value = /*member*/ ctx[23].memberId + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$3.name,
			type: "slot",
			source: "(120:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (126:16) {:else}
	function create_else_block_1$3(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_15$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_14$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_13$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_12$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$3.name,
			type: "else",
			source: "(126:16) {:else}",
			ctx
		});

		return block;
	}

	// (121:16) {#if editingMemberId === member.memberId}
	function create_if_block_1$4(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let tablebodycell3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_11$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell3 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
				create_component(tablebodycell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
				const tablebodycell3_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell3_changes.$$scope = { dirty, ctx };
				}

				tablebodycell3.$set(tablebodycell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				transition_in(tablebodycell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				transition_out(tablebodycell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
				destroy_component(tablebodycell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$4.name,
			type: "if",
			source: "(121:16) {#if editingMemberId === member.memberId}",
			ctx
		});

		return block;
	}

	// (127:20) <TableBodyCell>
	function create_default_slot_15$3(ctx) {
		let t_value = /*member*/ ctx[23].memberName + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*members*/ 16 && t_value !== (t_value = /*member*/ ctx[23].memberName + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$3.name,
			type: "slot",
			source: "(127:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (128:20) <TableBodyCell>
	function create_default_slot_14$3(ctx) {
		let t_value = /*member*/ ctx[23].email + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*members*/ 16 && t_value !== (t_value = /*member*/ ctx[23].email + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$3.name,
			type: "slot",
			source: "(128:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (129:20) <TableBodyCell>
	function create_default_slot_13$3(ctx) {
		let t_value = formatScheduleTime(/*member*/ ctx[23].dateJoined) + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*members*/ 16 && t_value !== (t_value = formatScheduleTime(/*member*/ ctx[23].dateJoined) + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$3.name,
			type: "slot",
			source: "(129:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (130:20) <TableBodyCell>
	function create_default_slot_12$3(ctx) {
		let t_value = /*member*/ ctx[23].membershipType + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*members*/ 16 && t_value !== (t_value = /*member*/ ctx[23].membershipType + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$3.name,
			type: "slot",
			source: "(130:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (122:20) <TableBodyCell>
	function create_default_slot_11$3(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[15](value, /*member*/ ctx[23]);
		}

		let input_props = { type: "text" };

		if (/*member*/ ctx[23].memberName !== void 0) {
			input_props.value = /*member*/ ctx[23].memberName;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*members*/ 16) {
					updating_value = true;
					input_changes.value = /*member*/ ctx[23].memberName;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$3.name,
			type: "slot",
			source: "(122:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (123:20) <TableBodyCell>
	function create_default_slot_10$3(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_1(value) {
			/*input_value_binding_1*/ ctx[16](value, /*member*/ ctx[23]);
		}

		let input_props = { type: "email" };

		if (/*member*/ ctx[23].email !== void 0) {
			input_props.value = /*member*/ ctx[23].email;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*members*/ 16) {
					updating_value = true;
					input_changes.value = /*member*/ ctx[23].email;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$3.name,
			type: "slot",
			source: "(123:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (124:20) <TableBodyCell>
	function create_default_slot_9$3(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_2(value) {
			/*input_value_binding_2*/ ctx[17](value, /*member*/ ctx[23]);
		}

		let input_props = { type: "date" };

		if (/*member*/ ctx[23].dateJoined !== void 0) {
			input_props.value = /*member*/ ctx[23].dateJoined;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_2));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*members*/ 16) {
					updating_value = true;
					input_changes.value = /*member*/ ctx[23].dateJoined;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$3.name,
			type: "slot",
			source: "(124:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (125:20) <TableBodyCell>
	function create_default_slot_8$4(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_3(value) {
			/*input_value_binding_3*/ ctx[18](value, /*member*/ ctx[23]);
		}

		let input_props = { type: "text" };

		if (/*member*/ ctx[23].membershipType !== void 0) {
			input_props.value = /*member*/ ctx[23].membershipType;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_3));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*members*/ 16) {
					updating_value = true;
					input_changes.value = /*member*/ ctx[23].membershipType;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$4.name,
			type: "slot",
			source: "(125:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (136:20) {:else}
	function create_else_block$3(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[20](/*member*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler_1);

		function click_handler_2() {
			return /*click_handler_2*/ ctx[21](/*member*/ ctx[23]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_2);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$3.name,
			type: "else",
			source: "(136:20) {:else}",
			ctx
		});

		return block;
	}

	// (133:20) {#if editingMemberId === member.memberId}
	function create_if_block$4(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[19](/*member*/ ctx[23]);
		}

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[9]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$4.name,
			type: "if",
			source: "(133:20) {#if editingMemberId === member.memberId}",
			ctx
		});

		return block;
	}

	// (137:24) <Button color="blue" on:click={() => startEditing(member.memberId)}>
	function create_default_slot_7$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$4.name,
			type: "slot",
			source: "(137:24) <Button color=\\\"blue\\\" on:click={() => startEditing(member.memberId)}>",
			ctx
		});

		return block;
	}

	// (138:24) <Button color="red" on:click={() => deleteMember(member.memberId)}>
	function create_default_slot_6$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$4.name,
			type: "slot",
			source: "(138:24) <Button color=\\\"red\\\" on:click={() => deleteMember(member.memberId)}>",
			ctx
		});

		return block;
	}

	// (134:24) <Button color="green" on:click={() => updateMembers(member.memberId)}>
	function create_default_slot_5$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$4.name,
			type: "slot",
			source: "(134:24) <Button color=\\\"green\\\" on:click={() => updateMembers(member.memberId)}>",
			ctx
		});

		return block;
	}

	// (135:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$4(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$4.name,
			type: "slot",
			source: "(135:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (132:16) <TableBodyCell>
	function create_default_slot_3$4(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$4, create_else_block$3];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*editingMemberId*/ ctx[5] === /*member*/ ctx[23].memberId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$4.name,
			type: "slot",
			source: "(132:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (119:12) <TableBodyRow>
	function create_default_slot_2$4(ctx) {
		let tablebodycell0;
		let t0;
		let current_block_type_index;
		let if_block;
		let t1;
		let tablebodycell1;
		let t2;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_16$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const if_block_creators = [create_if_block_1$4, create_else_block_1$3];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*editingMemberId*/ ctx[5] === /*member*/ ctx[23].memberId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				if_block.c();
				t1 = space();
				create_component(tablebodycell1.$$.fragment);
				t2 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t2, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, members*/ 67108880) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(t1.parentNode, t1);
				}

				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, members, editingMemberId*/ 67108912) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(if_block);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(if_block);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				if_blocks[current_block_type_index].d(detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$4.name,
			type: "slot",
			source: "(119:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (118:8) {#each members as member}
	function create_each_block$3(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty & /*$$scope, members, editingMemberId*/ 67108912) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$3.name,
			type: "each",
			source: "(118:8) {#each members as member}",
			ctx
		});

		return block;
	}

	// (117:4) <TableBody>
	function create_default_slot_1$4(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*members*/ ctx[4]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*stopEditing, updateMembers, members, editingMemberId, deleteMember, startEditing*/ 1968) {
					each_value = ensure_array_like_dev(/*members*/ ctx[4]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$3(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$3(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$4.name,
			type: "slot",
			source: "(117:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (104:0) <Table class="mt-4">
	function create_default_slot$4(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_17$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Gym Members\n        ");
				p = element("p");
				p.textContent = "Here is a list of the current members at the gym.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$4, 123, 8, 3729);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$4, 121, 4, 3591);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty & /*$$scope, members, editingMemberId*/ 67108912) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$4.name,
			type: "slot",
			source: "(104:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$4(ctx) {
		let heading;
		let t0;
		let form;
		let div4;
		let div0;
		let label0;
		let t1;
		let input0;
		let updating_value;
		let t2;
		let div1;
		let label1;
		let t3;
		let input1;
		let updating_value_1;
		let t4;
		let div2;
		let label2;
		let t5;
		let input2;
		let updating_value_2;
		let t6;
		let div3;
		let label3;
		let t7;
		let input3;
		let updating_value_3;
		let t8;
		let button;
		let t9;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_29] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "memberName",
					class: "mb-2",
					$$slots: { default: [create_default_slot_28] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[11](value);
		}

		let input0_props = {
			type: "text",
			id: "memberName",
			placeholder: "John Doe",
			required: true
		};

		if (/*memberName*/ ctx[0] !== void 0) {
			input0_props.value = /*memberName*/ ctx[0];
		}

		input0 = new Input({ props: input0_props, $$inline: true });
		binding_callbacks.push(() => bind(input0, 'value', input0_value_binding));

		label1 = new Label({
				props: {
					for: "email",
					class: "mb-2",
					$$slots: { default: [create_default_slot_27] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[12](value);
		}

		let input1_props = {
			type: "email",
			id: "email",
			placeholder: "john.doe@example.com",
			required: true
		};

		if (/*email*/ ctx[1] !== void 0) {
			input1_props.value = /*email*/ ctx[1];
		}

		input1 = new Input({ props: input1_props, $$inline: true });
		binding_callbacks.push(() => bind(input1, 'value', input1_value_binding));

		label2 = new Label({
				props: {
					for: "dateJoined",
					class: "mb-2",
					$$slots: { default: [create_default_slot_26$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input2_value_binding(value) {
			/*input2_value_binding*/ ctx[13](value);
		}

		let input2_props = {
			type: "date",
			id: "dateJoined",
			required: true
		};

		if (/*dateJoined*/ ctx[2] !== void 0) {
			input2_props.value = /*dateJoined*/ ctx[2];
		}

		input2 = new Input({ props: input2_props, $$inline: true });
		binding_callbacks.push(() => bind(input2, 'value', input2_value_binding));

		label3 = new Label({
				props: {
					for: "membershipType",
					class: "mb-2",
					$$slots: { default: [create_default_slot_25$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input3_value_binding(value) {
			/*input3_value_binding*/ ctx[14](value);
		}

		let input3_props = {
			type: "text",
			id: "membershipType",
			placeholder: "Standard"
		};

		if (/*membershipType*/ ctx[3] !== void 0) {
			input3_props.value = /*membershipType*/ ctx[3];
		}

		input3 = new Input({ props: input3_props, $$inline: true });
		binding_callbacks.push(() => bind(input3, 'value', input3_value_binding));

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_24$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div4 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				create_component(input0.$$.fragment);
				t2 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t3 = space();
				create_component(input1.$$.fragment);
				t4 = space();
				div2 = element("div");
				create_component(label2.$$.fragment);
				t5 = space();
				create_component(input2.$$.fragment);
				t6 = space();
				div3 = element("div");
				create_component(label3.$$.fragment);
				t7 = space();
				create_component(input3.$$.fragment);
				t8 = space();
				create_component(button.$$.fragment);
				t9 = space();
				create_component(table.$$.fragment);
				add_location(div0, file$4, 101, 8, 2676);
				add_location(div1, file$4, 105, 8, 2881);
				add_location(div2, file$4, 109, 8, 3078);
				add_location(div3, file$4, 113, 8, 3260);
				attr_dev(div4, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div4, file$4, 100, 4, 2623);
				attr_dev(form, "id", "memberForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$4, 99, 0, 2512);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div4);
				append_dev(div4, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				mount_component(input0, div0, null);
				append_dev(div4, t2);
				append_dev(div4, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t3);
				mount_component(input1, div1, null);
				append_dev(div4, t4);
				append_dev(div4, div2);
				mount_component(label2, div2, null);
				append_dev(div2, t5);
				mount_component(input2, div2, null);
				append_dev(div4, t6);
				append_dev(div4, div3);
				mount_component(label3, div3, null);
				append_dev(div3, t7);
				mount_component(input3, div3, null);
				append_dev(form, t8);
				mount_component(button, form, null);
				insert_dev(target, t9, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(form, "submit", prevent_default(/*handleMemberSubmit*/ ctx[6]), false, true, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const heading_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);
				const input0_changes = {};

				if (!updating_value && dirty & /*memberName*/ 1) {
					updating_value = true;
					input0_changes.value = /*memberName*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				input0.$set(input0_changes);
				const label1_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*email*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*email*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				input1.$set(input1_changes);
				const label2_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label2_changes.$$scope = { dirty, ctx };
				}

				label2.$set(label2_changes);
				const input2_changes = {};

				if (!updating_value_2 && dirty & /*dateJoined*/ 4) {
					updating_value_2 = true;
					input2_changes.value = /*dateJoined*/ ctx[2];
					add_flush_callback(() => updating_value_2 = false);
				}

				input2.$set(input2_changes);
				const label3_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					label3_changes.$$scope = { dirty, ctx };
				}

				label3.$set(label3_changes);
				const input3_changes = {};

				if (!updating_value_3 && dirty & /*membershipType*/ 8) {
					updating_value_3 = true;
					input3_changes.value = /*membershipType*/ ctx[3];
					add_flush_callback(() => updating_value_3 = false);
				}

				input3.$set(input3_changes);
				const button_changes = {};

				if (dirty & /*$$scope*/ 67108864) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty & /*$$scope, members, editingMemberId*/ 67108912) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(input0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				transition_in(label2.$$.fragment, local);
				transition_in(input2.$$.fragment, local);
				transition_in(label3.$$.fragment, local);
				transition_in(input3.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(input0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				transition_out(label2.$$.fragment, local);
				transition_out(input2.$$.fragment, local);
				transition_out(label3.$$.fragment, local);
				transition_out(input3.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t9);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_component(input0);
				destroy_component(label1);
				destroy_component(input1);
				destroy_component(label2);
				destroy_component(input2);
				destroy_component(label3);
				destroy_component(input3);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Members', slots, []);
		let memberName = '';
		let email = '';
		let dateJoined = '';
		let membershipType = 'Standard';
		let members = [];
		let editingMemberId = null;

		onMount(async () => {
			try {
				$$invalidate(4, members = await fetchMembers());
			} catch(error) {
				console.error('Failed to fetch equipment:', error);
			}
		});

		async function submitMember() {
			const response = await fetch('/api/members', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					memberName,
					email,
					dateJoined,
					membershipType
				})
			});

			if (!response.ok) {
				console.error('Failed to submit equipment');
				return;
			}

			// After successfully adding a member, re-fetch the member list to update the UI
			$$invalidate(4, members = await fetchMembers());

			// Reset form fields
			$$invalidate(0, memberName = '');

			$$invalidate(1, email = '');
			$$invalidate(2, dateJoined = '');
			$$invalidate(3, membershipType = '');
		}

		function handleMemberSubmit(event) {
			event.preventDefault();
			submitMember();
		}

		async function deleteMember(memberId) {
			const response = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });

			if (!response.ok) {
				console.error('Failed to delete member');
				return;
			}

			// Re-fetch the members to update the list after deletion
			$$invalidate(4, members = await fetchMembers());
		}

		function startEditing(memberId) {
			$$invalidate(5, editingMemberId = memberId);
		}

		function stopEditing() {
			$$invalidate(5, editingMemberId = null);
		}

		async function updateMembers(memberId) {
			const membersToUpdate = members.find(e => e.memberId === editingMemberId);
			if (!membersToUpdate) return;

			const response = await fetch(`/api/members/${memberId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(membersToUpdate)
			});

			if (!response.ok) {
				console.error('Failed to update equipment');
				return;
			}

			// After successfully updating the equipment, re-fetch the equipment list to update the UI
			$$invalidate(4, members = await fetchMembers());

			// Exit editing mode
			stopEditing();
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Members> was created with unknown prop '${key}'`);
		});

		function input0_value_binding(value) {
			memberName = value;
			$$invalidate(0, memberName);
		}

		function input1_value_binding(value) {
			email = value;
			$$invalidate(1, email);
		}

		function input2_value_binding(value) {
			dateJoined = value;
			$$invalidate(2, dateJoined);
		}

		function input3_value_binding(value) {
			membershipType = value;
			$$invalidate(3, membershipType);
		}

		function input_value_binding(value, member) {
			if ($$self.$$.not_equal(member.memberName, value)) {
				member.memberName = value;
				$$invalidate(4, members);
			}
		}

		function input_value_binding_1(value, member) {
			if ($$self.$$.not_equal(member.email, value)) {
				member.email = value;
				$$invalidate(4, members);
			}
		}

		function input_value_binding_2(value, member) {
			if ($$self.$$.not_equal(member.dateJoined, value)) {
				member.dateJoined = value;
				$$invalidate(4, members);
			}
		}

		function input_value_binding_3(value, member) {
			if ($$self.$$.not_equal(member.membershipType, value)) {
				member.membershipType = value;
				$$invalidate(4, members);
			}
		}

		const click_handler = member => updateMembers(member.memberId);
		const click_handler_1 = member => startEditing(member.memberId);
		const click_handler_2 = member => deleteMember(member.memberId);

		$$self.$capture_state = () => ({
			onMount,
			fetchMembers,
			Button,
			Input,
			Label,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Heading,
			formatScheduleTime,
			memberName,
			email,
			dateJoined,
			membershipType,
			members,
			editingMemberId,
			submitMember,
			handleMemberSubmit,
			deleteMember,
			startEditing,
			stopEditing,
			updateMembers
		});

		$$self.$inject_state = $$props => {
			if ('memberName' in $$props) $$invalidate(0, memberName = $$props.memberName);
			if ('email' in $$props) $$invalidate(1, email = $$props.email);
			if ('dateJoined' in $$props) $$invalidate(2, dateJoined = $$props.dateJoined);
			if ('membershipType' in $$props) $$invalidate(3, membershipType = $$props.membershipType);
			if ('members' in $$props) $$invalidate(4, members = $$props.members);
			if ('editingMemberId' in $$props) $$invalidate(5, editingMemberId = $$props.editingMemberId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			memberName,
			email,
			dateJoined,
			membershipType,
			members,
			editingMemberId,
			handleMemberSubmit,
			deleteMember,
			startEditing,
			stopEditing,
			updateMembers,
			input0_value_binding,
			input1_value_binding,
			input2_value_binding,
			input3_value_binding,
			input_value_binding,
			input_value_binding_1,
			input_value_binding_2,
			input_value_binding_3,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Members extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Members",
				options,
				id: create_fragment$4.name
			});
		}
	}

	async function fetchInstructors() {
	    try {
	        const response = await fetch('/api/instructors');
	        if (!response.ok) {
	            console.error('Failed to fetch instructors');
	            return [];
	        }
	        const instructors = await response.json();
	        return instructors;
	    }
	    catch (error) {
	        console.error('Error fetching instructors:', error);
	        return [];
	    }
	}

	/* src/frontend/components/Instructors.svelte generated by Svelte v4.2.12 */

	const { console: console_1$2 } = globals;

	const file$3 = "src/frontend/components/Instructors.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[17] = list[i];
		child_ctx[18] = list;
		child_ctx[19] = i;
		return child_ctx;
	}

	// (76:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_21$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Add or edit an instructor");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_21$1.name,
			type: "slot",
			source: "(76:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (80:12) <Label for="instructorName" class="mb-2">
	function create_default_slot_20$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Instructor Name:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20$1.name,
			type: "slot",
			source: "(80:12) <Label for=\\\"instructorName\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (84:12) <Label for="specialty" class="mb-2">
	function create_default_slot_19$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Specialty:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19$1.name,
			type: "slot",
			source: "(84:12) <Label for=\\\"specialty\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (88:4) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_18$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Submit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18$1.name,
			type: "slot",
			source: "(88:4) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (96:8) <TableHeadCell>
	function create_default_slot_17$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Instructor ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$2.name,
			type: "slot",
			source: "(96:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (97:8) <TableHeadCell>
	function create_default_slot_16$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$2.name,
			type: "slot",
			source: "(97:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (98:8) <TableHeadCell>
	function create_default_slot_15$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Specialty");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$2.name,
			type: "slot",
			source: "(98:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (99:8) <TableHeadCell>
	function create_default_slot_14$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$2.name,
			type: "slot",
			source: "(99:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (95:4) <TableHead>
	function create_default_slot_13$2(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_17$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_16$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_15$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_14$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$2.name,
			type: "slot",
			source: "(95:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (104:16) <TableBodyCell>
	function create_default_slot_12$2(ctx) {
		let t_value = /*instructor*/ ctx[17].instructorId + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*instructors*/ 4 && t_value !== (t_value = /*instructor*/ ctx[17].instructorId + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$2.name,
			type: "slot",
			source: "(104:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (108:16) {:else}
	function create_else_block_1$2(ctx) {
		let tablebodycell0;
		let t;
		let tablebodycell1;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_11$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t = space();
				create_component(tablebodycell1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(tablebodycell1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, instructors*/ 1048580) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, instructors*/ 1048580) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$2.name,
			type: "else",
			source: "(108:16) {:else}",
			ctx
		});

		return block;
	}

	// (105:16) {#if editingInstructorId === instructor.instructorId}
	function create_if_block_1$3(ctx) {
		let tablebodycell0;
		let t;
		let tablebodycell1;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t = space();
				create_component(tablebodycell1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(tablebodycell1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, instructors*/ 1048580) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, instructors*/ 1048580) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$3.name,
			type: "if",
			source: "(105:16) {#if editingInstructorId === instructor.instructorId}",
			ctx
		});

		return block;
	}

	// (109:20) <TableBodyCell>
	function create_default_slot_11$2(ctx) {
		let t_value = /*instructor*/ ctx[17].instructorName + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*instructors*/ 4 && t_value !== (t_value = /*instructor*/ ctx[17].instructorName + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$2.name,
			type: "slot",
			source: "(109:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (110:20) <TableBodyCell>
	function create_default_slot_10$2(ctx) {
		let t_value = /*instructor*/ ctx[17].specialty + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*instructors*/ 4 && t_value !== (t_value = /*instructor*/ ctx[17].specialty + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$2.name,
			type: "slot",
			source: "(110:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (106:20) <TableBodyCell>
	function create_default_slot_9$2(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[11](value, /*instructor*/ ctx[17]);
		}

		let input_props = { type: "text" };

		if (/*instructor*/ ctx[17].instructorName !== void 0) {
			input_props.value = /*instructor*/ ctx[17].instructorName;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*instructors*/ 4) {
					updating_value = true;
					input_changes.value = /*instructor*/ ctx[17].instructorName;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$2.name,
			type: "slot",
			source: "(106:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (107:20) <TableBodyCell>
	function create_default_slot_8$3(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_1(value) {
			/*input_value_binding_1*/ ctx[12](value, /*instructor*/ ctx[17]);
		}

		let input_props = { type: "text" };

		if (/*instructor*/ ctx[17].specialty !== void 0) {
			input_props.value = /*instructor*/ ctx[17].specialty;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const input_changes = {};

				if (!updating_value && dirty & /*instructors*/ 4) {
					updating_value = true;
					input_changes.value = /*instructor*/ ctx[17].specialty;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$3.name,
			type: "slot",
			source: "(107:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (116:20) {:else}
	function create_else_block$2(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[14](/*instructor*/ ctx[17]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler_1);

		function click_handler_2() {
			return /*click_handler_2*/ ctx[15](/*instructor*/ ctx[17]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_2);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$2.name,
			type: "else",
			source: "(116:20) {:else}",
			ctx
		});

		return block;
	}

	// (113:20) {#if editingInstructorId === instructor.instructorId}
	function create_if_block$3(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[13](/*instructor*/ ctx[17]);
		}

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[7]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(113:20) {#if editingInstructorId === instructor.instructorId}",
			ctx
		});

		return block;
	}

	// (117:24) <Button color="blue" on:click={() => startEditing(instructor.instructorId)}>
	function create_default_slot_7$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$3.name,
			type: "slot",
			source: "(117:24) <Button color=\\\"blue\\\" on:click={() => startEditing(instructor.instructorId)}>",
			ctx
		});

		return block;
	}

	// (118:24) <Button color="red" on:click={() => deleteInstructor(instructor.instructorId)}>
	function create_default_slot_6$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$3.name,
			type: "slot",
			source: "(118:24) <Button color=\\\"red\\\" on:click={() => deleteInstructor(instructor.instructorId)}>",
			ctx
		});

		return block;
	}

	// (114:24) <Button color="green" on:click={() => updateInstructors(instructor.instructorId)}>
	function create_default_slot_5$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$3.name,
			type: "slot",
			source: "(114:24) <Button color=\\\"green\\\" on:click={() => updateInstructors(instructor.instructorId)}>",
			ctx
		});

		return block;
	}

	// (115:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$3.name,
			type: "slot",
			source: "(115:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (112:16) <TableBodyCell>
	function create_default_slot_3$3(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$3, create_else_block$2];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*editingInstructorId*/ ctx[3] === /*instructor*/ ctx[17].instructorId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$3.name,
			type: "slot",
			source: "(112:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (103:12) <TableBodyRow>
	function create_default_slot_2$3(ctx) {
		let tablebodycell0;
		let t0;
		let current_block_type_index;
		let if_block;
		let t1;
		let tablebodycell1;
		let t2;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_12$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const if_block_creators = [create_if_block_1$3, create_else_block_1$2];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*editingInstructorId*/ ctx[3] === /*instructor*/ ctx[17].instructorId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				if_block.c();
				t1 = space();
				create_component(tablebodycell1.$$.fragment);
				t2 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t2, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, instructors*/ 1048580) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(t1.parentNode, t1);
				}

				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, instructors, editingInstructorId*/ 1048588) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(if_block);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(if_block);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				if_blocks[current_block_type_index].d(detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$3.name,
			type: "slot",
			source: "(103:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (102:8) {#each instructors as instructor}
	function create_each_block$2(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty & /*$$scope, instructors, editingInstructorId*/ 1048588) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(102:8) {#each instructors as instructor}",
			ctx
		});

		return block;
	}

	// (101:4) <TableBody>
	function create_default_slot_1$3(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*instructors*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*stopEditing, updateInstructors, instructors, editingInstructorId, deleteInstructor, startEditing*/ 492) {
					each_value = ensure_array_like_dev(/*instructors*/ ctx[2]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$3.name,
			type: "slot",
			source: "(101:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (90:0) <Table class="mt-4">
	function create_default_slot$3(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_13$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Gym Instructors\n        ");
				p = element("p");
				p.textContent = "Here is a list of the current instructors at the gym.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$3, 110, 8, 3273);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$3, 108, 4, 3131);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty & /*$$scope, instructors, editingInstructorId*/ 1048588) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$3.name,
			type: "slot",
			source: "(90:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$3(ctx) {
		let heading;
		let t0;
		let form;
		let div2;
		let div0;
		let label0;
		let t1;
		let input0;
		let updating_value;
		let t2;
		let div1;
		let label1;
		let t3;
		let input1;
		let updating_value_1;
		let t4;
		let button;
		let t5;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_21$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "instructorName",
					class: "mb-2",
					$$slots: { default: [create_default_slot_20$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[9](value);
		}

		let input0_props = {
			type: "text",
			id: "instructorName",
			placeholder: "Kayla Doe",
			required: true
		};

		if (/*instructorName*/ ctx[0] !== void 0) {
			input0_props.value = /*instructorName*/ ctx[0];
		}

		input0 = new Input({ props: input0_props, $$inline: true });
		binding_callbacks.push(() => bind(input0, 'value', input0_value_binding));

		label1 = new Label({
				props: {
					for: "specialty",
					class: "mb-2",
					$$slots: { default: [create_default_slot_19$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[10](value);
		}

		let input1_props = {
			type: "text",
			id: "specialty",
			placeholder: "Cardio",
			required: true
		};

		if (/*specialty*/ ctx[1] !== void 0) {
			input1_props.value = /*specialty*/ ctx[1];
		}

		input1 = new Input({ props: input1_props, $$inline: true });
		binding_callbacks.push(() => bind(input1, 'value', input1_value_binding));

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_18$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div2 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				create_component(input0.$$.fragment);
				t2 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t3 = space();
				create_component(input1.$$.fragment);
				t4 = space();
				create_component(button.$$.fragment);
				t5 = space();
				create_component(table.$$.fragment);
				add_location(div0, file$3, 96, 8, 2594);
				add_location(div1, file$3, 100, 8, 2816);
				attr_dev(div2, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div2, file$3, 95, 4, 2541);
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$3, 94, 0, 2442);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div2);
				append_dev(div2, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				mount_component(input0, div0, null);
				append_dev(div2, t2);
				append_dev(div2, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t3);
				mount_component(input1, div1, null);
				append_dev(form, t4);
				mount_component(button, form, null);
				insert_dev(target, t5, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(form, "submit", prevent_default(/*handleInstructorSubmit*/ ctx[4]), false, true, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const heading_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);
				const input0_changes = {};

				if (!updating_value && dirty & /*instructorName*/ 1) {
					updating_value = true;
					input0_changes.value = /*instructorName*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				input0.$set(input0_changes);
				const label1_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*specialty*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*specialty*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				input1.$set(input1_changes);
				const button_changes = {};

				if (dirty & /*$$scope*/ 1048576) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty & /*$$scope, instructors, editingInstructorId*/ 1048588) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(input0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(input0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t5);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_component(input0);
				destroy_component(label1);
				destroy_component(input1);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Instructors', slots, []);
		let instructorName = '';
		let specialty = '';
		let instructors = [];
		let editingInstructorId = null;

		onMount(async () => {
			try {
				$$invalidate(2, instructors = await fetchInstructors());
			} catch(error) {
				console.error('Failed to fetch instructors:', error);
			}
		});

		async function submitInstructor() {
			const response = await fetch('/api/instructors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instructorName, specialty })
			});

			if (!response.ok) {
				console.error('Failed to submit Instructor');
				return;
			}

			// After successfully adding an instructor, re-fetch the instructor list to update the UI
			$$invalidate(2, instructors = await fetchInstructors());

			// Reset form fields
			$$invalidate(0, instructorName = '');

			$$invalidate(1, specialty = '');
		}

		function handleInstructorSubmit(event) {
			event.preventDefault();
			submitInstructor();
		}

		async function deleteInstructor(instructorId) {
			const response = await fetch(`/api/instructors/${instructorId}`, { method: 'DELETE' });

			if (!response.ok) {
				console.error('Failed to delete instructor');
				return;
			}

			$$invalidate(2, instructors = await fetchInstructors());
		}

		function startEditing(instructorId) {
			$$invalidate(3, editingInstructorId = instructorId);
		}

		function stopEditing() {
			$$invalidate(3, editingInstructorId = null);
		}

		async function updateInstructors(instructorId) {
			const instructorsToUpdate = instructors.find(e => e.instructorId === editingInstructorId);
			if (!instructorsToUpdate) return;

			const response = await fetch(`/api/instructors/${instructorId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(instructorsToUpdate)
			});

			if (!response.ok) {
				console.error('Failed to update instructors');
				return;
			}

			// After successfully updating the instructors, re-fetch the instructors list to update the UI
			$$invalidate(2, instructors = await fetchInstructors());

			// Exit editing mode
			stopEditing();
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Instructors> was created with unknown prop '${key}'`);
		});

		function input0_value_binding(value) {
			instructorName = value;
			$$invalidate(0, instructorName);
		}

		function input1_value_binding(value) {
			specialty = value;
			$$invalidate(1, specialty);
		}

		function input_value_binding(value, instructor) {
			if ($$self.$$.not_equal(instructor.instructorName, value)) {
				instructor.instructorName = value;
				$$invalidate(2, instructors);
			}
		}

		function input_value_binding_1(value, instructor) {
			if ($$self.$$.not_equal(instructor.specialty, value)) {
				instructor.specialty = value;
				$$invalidate(2, instructors);
			}
		}

		const click_handler = instructor => updateInstructors(instructor.instructorId);
		const click_handler_1 = instructor => startEditing(instructor.instructorId);
		const click_handler_2 = instructor => deleteInstructor(instructor.instructorId);

		$$self.$capture_state = () => ({
			onMount,
			fetchInstructors,
			Button,
			Input,
			Label,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Heading,
			instructorName,
			specialty,
			instructors,
			editingInstructorId,
			submitInstructor,
			handleInstructorSubmit,
			deleteInstructor,
			startEditing,
			stopEditing,
			updateInstructors
		});

		$$self.$inject_state = $$props => {
			if ('instructorName' in $$props) $$invalidate(0, instructorName = $$props.instructorName);
			if ('specialty' in $$props) $$invalidate(1, specialty = $$props.specialty);
			if ('instructors' in $$props) $$invalidate(2, instructors = $$props.instructors);
			if ('editingInstructorId' in $$props) $$invalidate(3, editingInstructorId = $$props.editingInstructorId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			instructorName,
			specialty,
			instructors,
			editingInstructorId,
			handleInstructorSubmit,
			deleteInstructor,
			startEditing,
			stopEditing,
			updateInstructors,
			input0_value_binding,
			input1_value_binding,
			input_value_binding,
			input_value_binding_1,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Instructors extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Instructors",
				options,
				id: create_fragment$3.name
			});
		}
	}

	// Function to fetch instructor classes from the backend
	async function fetchClassInstructors() {
	    try {
	        const response = await fetch('/api/classInstructors');
	        if (!response.ok) {
	            throw new Error('Network response was not ok');
	        }
	        const classInstructors = await response.json();
	        return classInstructors;
	    }
	    catch (error) {
	        console.error('There was a problem fetching the instructor classes:', error);
	        throw error; // Rethrow the error so it can be handled by the caller
	    }
	}

	/* src/frontend/components/ClassInstructors.svelte generated by Svelte v4.2.12 */

	const { Error: Error_1$1, console: console_1$1 } = globals;
	const file$2 = "src/frontend/components/ClassInstructors.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[20] = list[i];
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		return child_ctx;
	}

	function get_each_context_2$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[26] = list[i];
		return child_ctx;
	}

	function get_each_context_3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		return child_ctx;
	}

	function get_each_context_4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[26] = list[i];
		return child_ctx;
	}

	// (118:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_17$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Assign an instructor to a class");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17$1.name,
			type: "slot",
			source: "(118:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (122:12) <Label for="classId">
	function create_default_slot_16$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16$1.name,
			type: "slot",
			source: "(122:12) <Label for=\\\"classId\\\">",
			ctx
		});

		return block;
	}

	// (125:16) {#each classes as classItem}
	function create_each_block_4(ctx) {
		let option;
		let t_value = /*classItem*/ ctx[26].className + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*classItem*/ ctx[26].classId;
				set_input_value(option, option.__value);
				add_location(option, file$2, 143, 20, 4720);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 1 && t_value !== (t_value = /*classItem*/ ctx[26].className + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*classes*/ 1 && option_value_value !== (option_value_value = /*classItem*/ ctx[26].classId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_4.name,
			type: "each",
			source: "(125:16) {#each classes as classItem}",
			ctx
		});

		return block;
	}

	// (131:12) <Label for="instructorId">
	function create_default_slot_15$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Instructor:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15$1.name,
			type: "slot",
			source: "(131:12) <Label for=\\\"instructorId\\\">",
			ctx
		});

		return block;
	}

	// (134:16) {#each instructors as instructor}
	function create_each_block_3(ctx) {
		let option;
		let t_value = /*instructor*/ ctx[23].instructorName + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*instructor*/ ctx[23].instructorId;
				set_input_value(option, option.__value);
				add_location(option, file$2, 152, 20, 5134);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*instructors*/ 2 && t_value !== (t_value = /*instructor*/ ctx[23].instructorName + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*instructors*/ 2 && option_value_value !== (option_value_value = /*instructor*/ ctx[23].instructorId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3.name,
			type: "each",
			source: "(134:16) {#each instructors as instructor}",
			ctx
		});

		return block;
	}

	// (139:8) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_14$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Register");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14$1.name,
			type: "slot",
			source: "(139:8) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (149:8) <TableHeadCell>
	function create_default_slot_13$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Class Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13$1.name,
			type: "slot",
			source: "(149:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (150:8) <TableHeadCell>
	function create_default_slot_12$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Instructor Name");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12$1.name,
			type: "slot",
			source: "(150:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (151:8) <TableHeadCell>
	function create_default_slot_11$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11$1.name,
			type: "slot",
			source: "(151:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (148:4) <TableHead>
	function create_default_slot_10$1(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_13$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_12$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_11$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10$1.name,
			type: "slot",
			source: "(148:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (165:20) {:else}
	function create_else_block_2$1(ctx) {
		let t_value = (/*classes*/ ctx[0].find(func)?.className || 'Unknown Class') + "";
		let t;

		function func(...args) {
			return /*func*/ ctx[14](/*classInstructor*/ ctx[20], ...args);
		}

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*classes, classInstructors*/ 17 && t_value !== (t_value = (/*classes*/ ctx[0].find(func)?.className || 'Unknown Class') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_2$1.name,
			type: "else",
			source: "(165:20) {:else}",
			ctx
		});

		return block;
	}

	// (158:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}
	function create_if_block_2$2(ctx) {
		let select;
		let option;
		let mounted;
		let dispose;
		let each_value_2 = ensure_array_like_dev(/*classes*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
		}

		const block = {
			c: function create() {
				select = element("select");
				option = element("option");
				option.textContent = "Select a class";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$2, 177, 28, 6251);
				if (/*editingState*/ ctx[5].classId === void 0) add_render_callback(() => /*select_change_handler*/ ctx[13].call(select));
				add_location(select, file$2, 176, 24, 6180);
			},
			m: function mount(target, anchor) {
				insert_dev(target, select, anchor);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*editingState*/ ctx[5].classId, true);

				if (!mounted) {
					dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[13]);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 1) {
					each_value_2 = ensure_array_like_dev(/*classes*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (dirty[0] & /*editingState, classes*/ 33) {
					select_option(select, /*editingState*/ ctx[5].classId);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(select);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$2.name,
			type: "if",
			source: "(158:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}",
			ctx
		});

		return block;
	}

	// (161:28) {#each classes as classItem}
	function create_each_block_2$1(ctx) {
		let option;
		let t_value = /*classItem*/ ctx[26].className + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*classItem*/ ctx[26].classId;
				set_input_value(option, option.__value);
				add_location(option, file$2, 179, 32, 6390);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*classes*/ 1 && t_value !== (t_value = /*classItem*/ ctx[26].className + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*classes*/ 1 && option_value_value !== (option_value_value = /*classItem*/ ctx[26].classId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$1.name,
			type: "each",
			source: "(161:28) {#each classes as classItem}",
			ctx
		});

		return block;
	}

	// (157:16) <TableBodyCell>
	function create_default_slot_9$1(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*editingState*/ ctx[5].classInstructorId === /*classInstructor*/ ctx[20].classInstructorId) return create_if_block_2$2;
			return create_else_block_2$1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9$1.name,
			type: "slot",
			source: "(157:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (180:20) {:else}
	function create_else_block_1$1(ctx) {
		let t_value = (/*instructors*/ ctx[1].find(func_1)?.instructorName || 'Unknown Instructor') + "";
		let t;

		function func_1(...args) {
			return /*func_1*/ ctx[16](/*classInstructor*/ ctx[20], ...args);
		}

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*instructors, classInstructors*/ 18 && t_value !== (t_value = (/*instructors*/ ctx[1].find(func_1)?.instructorName || 'Unknown Instructor') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1$1.name,
			type: "else",
			source: "(180:20) {:else}",
			ctx
		});

		return block;
	}

	// (173:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}
	function create_if_block_1$2(ctx) {
		let select;
		let option;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like_dev(/*instructors*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				select = element("select");
				option = element("option");
				option.textContent = "Select a class";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$2, 192, 28, 7131);
				if (/*editingState*/ ctx[5].instructorId === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[15].call(select));
				add_location(select, file$2, 191, 24, 7055);
			},
			m: function mount(target, anchor) {
				insert_dev(target, select, anchor);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*editingState*/ ctx[5].instructorId, true);

				if (!mounted) {
					dispose = listen_dev(select, "change", /*select_change_handler_1*/ ctx[15]);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*instructors*/ 2) {
					each_value_1 = ensure_array_like_dev(/*instructors*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}

				if (dirty[0] & /*editingState, classes*/ 33) {
					select_option(select, /*editingState*/ ctx[5].instructorId);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(select);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(173:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}",
			ctx
		});

		return block;
	}

	// (176:28) {#each instructors as instructor}
	function create_each_block_1$1(ctx) {
		let option;
		let t_value = /*instructor*/ ctx[23].instructorName + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*instructor*/ ctx[23].instructorId;
				set_input_value(option, option.__value);
				add_location(option, file$2, 194, 32, 7275);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*instructors*/ 2 && t_value !== (t_value = /*instructor*/ ctx[23].instructorName + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*instructors*/ 2 && option_value_value !== (option_value_value = /*instructor*/ ctx[23].instructorId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$1.name,
			type: "each",
			source: "(176:28) {#each instructors as instructor}",
			ctx
		});

		return block;
	}

	// (172:16) <TableBodyCell>
	function create_default_slot_8$2(ctx) {
		let if_block_anchor;

		function select_block_type_1(ctx, dirty) {
			if (/*editingState*/ ctx[5].classInstructorId === /*classInstructor*/ ctx[20].classInstructorId) return create_if_block_1$2;
			return create_else_block_1$1;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$2.name,
			type: "slot",
			source: "(172:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (192:20) {:else}
	function create_else_block$1(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[17](/*classInstructor*/ ctx[20]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		function click_handler_1() {
			return /*click_handler_1*/ ctx[18](/*classInstructor*/ ctx[20]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_1);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$1.name,
			type: "else",
			source: "(192:20) {:else}",
			ctx
		});

		return block;
	}

	// (188:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}
	function create_if_block$2(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", /*updateMemberClass*/ ctx[7]);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[9]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const button0_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(188:20) {#if editingState.classInstructorId === classInstructor.classInstructorId}",
			ctx
		});

		return block;
	}

	// (194:24) <Button color="blue" on:click={() => startEditing(classInstructor.classInstructorId, classInstructor.classId, classInstructor.instructorId)}>
	function create_default_slot_7$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$2.name,
			type: "slot",
			source: "(194:24) <Button color=\\\"blue\\\" on:click={() => startEditing(classInstructor.classInstructorId, classInstructor.classId, classInstructor.instructorId)}>",
			ctx
		});

		return block;
	}

	// (195:24) <Button color="red" on:click={() => deleteClassInstructor(classInstructor.classInstructorId)}>
	function create_default_slot_6$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$2.name,
			type: "slot",
			source: "(195:24) <Button color=\\\"red\\\" on:click={() => deleteClassInstructor(classInstructor.classInstructorId)}>",
			ctx
		});

		return block;
	}

	// (190:24) <Button color="green" on:click={updateMemberClass}>
	function create_default_slot_5$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$2.name,
			type: "slot",
			source: "(190:24) <Button color=\\\"green\\\" on:click={updateMemberClass}>",
			ctx
		});

		return block;
	}

	// (191:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$2.name,
			type: "slot",
			source: "(191:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (187:16) <TableBodyCell>
	function create_default_slot_3$2(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$2, create_else_block$1];
		const if_blocks = [];

		function select_block_type_2(ctx, dirty) {
			if (/*editingState*/ ctx[5].classInstructorId === /*classInstructor*/ ctx[20].classInstructorId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_2(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_2(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$2.name,
			type: "slot",
			source: "(187:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (155:12) <TableBodyRow>
	function create_default_slot_2$2(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let tablebodycell2;
		let t2;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_9$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				create_component(tablebodycell2.$$.fragment);
				t2 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t2, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty[0] & /*editingState, classes, classInstructors*/ 49 | dirty[1] & /*$$scope*/ 4) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty[0] & /*editingState, instructors, classInstructors*/ 50 | dirty[1] & /*$$scope*/ 4) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				const tablebodycell2_changes = {};

				if (dirty[0] & /*editingState, classInstructors*/ 48 | dirty[1] & /*$$scope*/ 4) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(tablebodycell2.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(tablebodycell2.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				destroy_component(tablebodycell2, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$2.name,
			type: "slot",
			source: "(155:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (154:8) {#each classInstructors as classInstructor}
	function create_each_block$1(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty[0] & /*editingState, classInstructors, instructors, classes*/ 51 | dirty[1] & /*$$scope*/ 4) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(154:8) {#each classInstructors as classInstructor}",
			ctx
		});

		return block;
	}

	// (153:4) <TableBody>
	function create_default_slot_1$2(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*classInstructors*/ ctx[4]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*stopEditing, updateMemberClass, editingState, classInstructors, deleteClassInstructor, startEditing, instructors, classes*/ 1971) {
					each_value = ensure_array_like_dev(/*classInstructors*/ ctx[4]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$2.name,
			type: "slot",
			source: "(153:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (143:0) <Table class="mt-4">
	function create_default_slot$2(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_10$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Current Class Instructors\n        ");
				p = element("p");
				p.textContent = "List of current classes offered and the instructors leading them.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$2, 163, 8, 5556);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$2, 161, 4, 5404);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty[0] & /*classInstructors, editingState, instructors, classes*/ 51 | dirty[1] & /*$$scope*/ 4) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$2.name,
			type: "slot",
			source: "(143:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$2(ctx) {
		let heading;
		let t0;
		let form;
		let div2;
		let div0;
		let label0;
		let t1;
		let select0;
		let option0;
		let t3;
		let div1;
		let label1;
		let t4;
		let select1;
		let option1;
		let t6;
		let button;
		let t7;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_17$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "classId",
					$$slots: { default: [create_default_slot_16$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let each_value_4 = ensure_array_like_dev(/*classes*/ ctx[0]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_4.length; i += 1) {
			each_blocks_1[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
		}

		label1 = new Label({
				props: {
					for: "instructorId",
					$$slots: { default: [create_default_slot_15$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let each_value_3 = ensure_array_like_dev(/*instructors*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value_3.length; i += 1) {
			each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
		}

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_14$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div2 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				select0 = element("select");
				option0 = element("option");
				option0.textContent = "Select a class";

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t3 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t4 = space();
				select1 = element("select");
				option1 = element("option");
				option1.textContent = "Select an instructor";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t6 = space();
				create_component(button.$$.fragment);
				t7 = space();
				create_component(table.$$.fragment);
				option0.__value = "";
				set_input_value(option0, option0.__value);
				option0.disabled = true;
				add_location(option0, file$2, 141, 16, 4605);
				attr_dev(select0, "id", "classId");
				select0.required = true;
				if (/*classId*/ ctx[2] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[11].call(select0));
				add_location(select0, file$2, 140, 12, 4537);
				add_location(div0, file$2, 138, 8, 4471);
				option1.__value = "";
				set_input_value(option1, option1.__value);
				option1.disabled = true;
				add_location(option1, file$2, 150, 16, 5008);
				attr_dev(select1, "id", "instructorId");
				select1.required = true;
				if (/*instructorId*/ ctx[3] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[12].call(select1));
				add_location(select1, file$2, 149, 12, 4930);
				add_location(div1, file$2, 147, 8, 4854);
				attr_dev(div2, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div2, file$2, 137, 4, 4418);
				attr_dev(form, "id", "classInstructorForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$2, 136, 0, 4289);
			},
			l: function claim(nodes) {
				throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div2);
				append_dev(div2, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				append_dev(div0, select0);
				append_dev(select0, option0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(select0, null);
					}
				}

				select_option(select0, /*classId*/ ctx[2], true);
				append_dev(div2, t3);
				append_dev(div2, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t4);
				append_dev(div1, select1);
				append_dev(select1, option1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select1, null);
					}
				}

				select_option(select1, /*instructorId*/ ctx[3], true);
				append_dev(div2, t6);
				mount_component(button, div2, null);
				insert_dev(target, t7, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(select0, "change", /*select0_change_handler*/ ctx[11]),
						listen_dev(select1, "change", /*select1_change_handler*/ ctx[12]),
						listen_dev(form, "submit", prevent_default(/*handleClassInstructorSubmit*/ ctx[6]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				const heading_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);

				if (dirty[0] & /*classes*/ 1) {
					each_value_4 = ensure_array_like_dev(/*classes*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_4.length; i += 1) {
						const child_ctx = get_each_context_4(ctx, each_value_4, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_4(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(select0, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_4.length;
				}

				if (dirty[0] & /*classId, classes*/ 5) {
					select_option(select0, /*classId*/ ctx[2]);
				}

				const label1_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);

				if (dirty[0] & /*instructors*/ 2) {
					each_value_3 = ensure_array_like_dev(/*instructors*/ ctx[1]);
					let i;

					for (i = 0; i < each_value_3.length; i += 1) {
						const child_ctx = get_each_context_3(ctx, each_value_3, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_3.length;
				}

				if (dirty[0] & /*instructorId, instructors*/ 10) {
					select_option(select1, /*instructorId*/ ctx[3]);
				}

				const button_changes = {};

				if (dirty[1] & /*$$scope*/ 4) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty[0] & /*classInstructors, editingState, instructors, classes*/ 51 | dirty[1] & /*$$scope*/ 4) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t7);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_each(each_blocks_1, detaching);
				destroy_component(label1);
				destroy_each(each_blocks, detaching);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ClassInstructors', slots, []);
		let classes = [];
		let instructors = [];
		let classId = 0;
		let instructorId = 0;
		let classInstructors = [];

		let editingState = {
			classInstructorId: null,
			classId: null,
			instructorId: null
		};

		onMount(async () => {
			try {
				$$invalidate(1, [instructors, classes, classInstructors] = await Promise.all([fetchInstructors(), fetchClasses(), fetchClassInstructors()]), instructors, $$invalidate(0, classes), $$invalidate(4, classInstructors));
			} catch(error) {
				console.error('Failed to fetch data:', error);
			}
		});

		async function submitClassInstructors() {
			// Validation: Check if all required fields are filled
			if (!instructorId || !classId) {
				console.error('All fields are required');
				return;
			}

			try {
				// Sending the POST request to the server
				const response = await fetch('/api/classInstructors', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ classId, instructorId })
				});

				if (!response.ok) {
					// Handling responses that are not 2xx
					throw new Error('Network response was not ok');
				}

				// Processing the successful response
				const result = await response.json();

				console.log('Class Instructor registration successful:', result);

				// Resetting form fields after successful submission
				$$invalidate(2, classId = 0);

				$$invalidate(3, instructorId = 0);

				// Refreshing the list of member classes to include the new registration
				$$invalidate(4, classInstructors = await fetchClassInstructors());
			} catch(error) {
				// Handling any errors that occurred during the fetch operation
				console.error('Failed to submit member class:', error);
			}
		}

		function handleClassInstructorSubmit(event) {
			event.preventDefault();
			submitClassInstructors();
		}

		// Function to handle editing of instructor classes
		async function updateMemberClass() {
			if (!editingState.classInstructorId) {
				console.error('Class Instructor ID is required');
				return;
			}

			try {
				const response = await fetch(`/api/classInstructors/${editingState.classInstructorId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						classId: editingState.classId,
						instructorId: editingState.instructorId
					})
				});

				if (!response.ok) {
					throw new Error('Network response was not ok');
				}

				console.log('Instructor class update successful');
				stopEditing(); // Reset editing state
				$$invalidate(4, classInstructors = await fetchClassInstructors()); // Refresh list
			} catch(error) {
				console.error('Failed to update member class:', error);
			}
		}

		function startEditing(classInstructorId, classId, instructorId) {
			$$invalidate(5, editingState = { classInstructorId, classId, instructorId });
		}

		// Function to stop editing
		function stopEditing() {
			$$invalidate(5, editingState = {
				classInstructorId: null,
				classId: null,
				instructorId: null
			});
		}

		// Function to delete a class instructor registration
		async function deleteClassInstructor(classInstructorId) {
			try {
				const response = await fetch(`/api/classInstructors/${classInstructorId}`, { method: 'DELETE' });

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Network response was not ok');
				}

				console.log('Cass Instructor deleted successfully');
				$$invalidate(4, classInstructors = await fetchClassInstructors()); // Refresh list
			} catch(error) {
				console.error('Failed to delete class instructors:', error);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<ClassInstructors> was created with unknown prop '${key}'`);
		});

		function select0_change_handler() {
			classId = select_value(this);
			$$invalidate(2, classId);
			$$invalidate(0, classes);
		}

		function select1_change_handler() {
			instructorId = select_value(this);
			$$invalidate(3, instructorId);
			$$invalidate(1, instructors);
		}

		function select_change_handler() {
			editingState.classId = select_value(this);
			$$invalidate(5, editingState);
			$$invalidate(0, classes);
		}

		const func = (classInstructor, c) => c.classId === classInstructor.classId;

		function select_change_handler_1() {
			editingState.instructorId = select_value(this);
			$$invalidate(5, editingState);
			$$invalidate(0, classes);
		}

		const func_1 = (classInstructor, i) => i.instructorId === classInstructor.instructorId;
		const click_handler = classInstructor => startEditing(classInstructor.classInstructorId, classInstructor.classId, classInstructor.instructorId);
		const click_handler_1 = classInstructor => deleteClassInstructor(classInstructor.classInstructorId);

		$$self.$capture_state = () => ({
			onMount,
			Button,
			Input,
			Label,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Heading,
			fetchClasses,
			fetchInstructors,
			fetchClassInstructors,
			classes,
			instructors,
			classId,
			instructorId,
			classInstructors,
			editingState,
			submitClassInstructors,
			handleClassInstructorSubmit,
			updateMemberClass,
			startEditing,
			stopEditing,
			deleteClassInstructor
		});

		$$self.$inject_state = $$props => {
			if ('classes' in $$props) $$invalidate(0, classes = $$props.classes);
			if ('instructors' in $$props) $$invalidate(1, instructors = $$props.instructors);
			if ('classId' in $$props) $$invalidate(2, classId = $$props.classId);
			if ('instructorId' in $$props) $$invalidate(3, instructorId = $$props.instructorId);
			if ('classInstructors' in $$props) $$invalidate(4, classInstructors = $$props.classInstructors);
			if ('editingState' in $$props) $$invalidate(5, editingState = $$props.editingState);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			classes,
			instructors,
			classId,
			instructorId,
			classInstructors,
			editingState,
			handleClassInstructorSubmit,
			updateMemberClass,
			startEditing,
			stopEditing,
			deleteClassInstructor,
			select0_change_handler,
			select1_change_handler,
			select_change_handler,
			func,
			select_change_handler_1,
			func_1,
			click_handler,
			click_handler_1
		];
	}

	class ClassInstructors extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ClassInstructors",
				options,
				id: create_fragment$2.name
			});
		}
	}

	/**
	 * Fetches all maintenance requests from the backend.
	 * @returns A promise that resolves to an array of MaintenanceRequest objects.
	 */
	async function fetchMaintenanceRequests() {
	    try {
	        const response = await fetch('/api/maintenanceRequests');
	        if (!response.ok) {
	            throw new Error('Network response was not ok');
	        }
	        const maintenanceRequests = await response.json();
	        return maintenanceRequests;
	    }
	    catch (error) {
	        console.error('Failed to fetch maintenance requests:', error);
	        throw error;
	    }
	}

	/* src/frontend/components/MaintenenceRequests.svelte generated by Svelte v4.2.12 */

	const { Error: Error_1, console: console_1 } = globals;
	const file$1 = "src/frontend/components/MaintenenceRequests.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[21] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[24] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[24] = list[i];
		return child_ctx;
	}

	// (113:0) <Heading tag="h2" class="bg-white dark:bg-gray-800 p-5">
	function create_default_slot_26(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Add or edit maintenance requests");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_26.name,
			type: "slot",
			source: "(113:0) <Heading tag=\\\"h2\\\" class=\\\"bg-white dark:bg-gray-800 p-5\\\">",
			ctx
		});

		return block;
	}

	// (117:12) <Label for="equipmentId" class="mb-2">
	function create_default_slot_25(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Equipment:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_25.name,
			type: "slot",
			source: "(117:12) <Label for=\\\"equipmentId\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (120:16) {#each equipment as equipmentItem}
	function create_each_block_2(ctx) {
		let option;
		let t_value = /*equipmentItem*/ ctx[24].equipmentType + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*equipmentItem*/ ctx[24].equipmentId;
				set_input_value(option, option.__value);
				add_location(option, file$1, 140, 20, 4549);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 8 && t_value !== (t_value = /*equipmentItem*/ ctx[24].equipmentType + "")) set_data_dev(t, t_value);

				if (dirty & /*equipment*/ 8 && option_value_value !== (option_value_value = /*equipmentItem*/ ctx[24].equipmentId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2.name,
			type: "each",
			source: "(120:16) {#each equipment as equipmentItem}",
			ctx
		});

		return block;
	}

	// (126:12) <Label for="requestDate" class="mb-2">
	function create_default_slot_24(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Request Date:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_24.name,
			type: "slot",
			source: "(126:12) <Label for=\\\"requestDate\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (130:12) <Label for="resolved" class="mb-2">
	function create_default_slot_23(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Resolved:");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_23.name,
			type: "slot",
			source: "(130:12) <Label for=\\\"resolved\\\" class=\\\"mb-2\\\">",
			ctx
		});

		return block;
	}

	// (131:12) <Checkbox id="resolved" bind:checked={resolved}>
	function create_default_slot_22(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Resolved");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_22.name,
			type: "slot",
			source: "(131:12) <Checkbox id=\\\"resolved\\\" bind:checked={resolved}>",
			ctx
		});

		return block;
	}

	// (134:4) <Button size="lg" class="w-32" type="submit" color="green">
	function create_default_slot_21(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Submit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_21.name,
			type: "slot",
			source: "(134:4) <Button size=\\\"lg\\\" class=\\\"w-32\\\" type=\\\"submit\\\" color=\\\"green\\\">",
			ctx
		});

		return block;
	}

	// (143:8) <TableHeadCell>
	function create_default_slot_20(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Request ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_20.name,
			type: "slot",
			source: "(143:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (144:8) <TableHeadCell>
	function create_default_slot_19(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Equipment ID");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_19.name,
			type: "slot",
			source: "(144:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (145:8) <TableHeadCell>
	function create_default_slot_18(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Request Date");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_18.name,
			type: "slot",
			source: "(145:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (146:8) <TableHeadCell>
	function create_default_slot_17(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Resolved");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_17.name,
			type: "slot",
			source: "(146:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (147:8) <TableHeadCell>
	function create_default_slot_16(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Actions");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_16.name,
			type: "slot",
			source: "(147:8) <TableHeadCell>",
			ctx
		});

		return block;
	}

	// (142:4) <TableHead>
	function create_default_slot_15(ctx) {
		let tableheadcell0;
		let t0;
		let tableheadcell1;
		let t1;
		let tableheadcell2;
		let t2;
		let tableheadcell3;
		let t3;
		let tableheadcell4;
		let current;

		tableheadcell0 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_20] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell1 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_19] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell2 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_18] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell3 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_17] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tableheadcell4 = new TableHeadCell({
				props: {
					$$slots: { default: [create_default_slot_16] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tableheadcell0.$$.fragment);
				t0 = space();
				create_component(tableheadcell1.$$.fragment);
				t1 = space();
				create_component(tableheadcell2.$$.fragment);
				t2 = space();
				create_component(tableheadcell3.$$.fragment);
				t3 = space();
				create_component(tableheadcell4.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tableheadcell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tableheadcell1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tableheadcell2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tableheadcell3, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tableheadcell4, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tableheadcell0_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tableheadcell0_changes.$$scope = { dirty, ctx };
				}

				tableheadcell0.$set(tableheadcell0_changes);
				const tableheadcell1_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tableheadcell1_changes.$$scope = { dirty, ctx };
				}

				tableheadcell1.$set(tableheadcell1_changes);
				const tableheadcell2_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tableheadcell2_changes.$$scope = { dirty, ctx };
				}

				tableheadcell2.$set(tableheadcell2_changes);
				const tableheadcell3_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tableheadcell3_changes.$$scope = { dirty, ctx };
				}

				tableheadcell3.$set(tableheadcell3_changes);
				const tableheadcell4_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tableheadcell4_changes.$$scope = { dirty, ctx };
				}

				tableheadcell4.$set(tableheadcell4_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tableheadcell0.$$.fragment, local);
				transition_in(tableheadcell1.$$.fragment, local);
				transition_in(tableheadcell2.$$.fragment, local);
				transition_in(tableheadcell3.$$.fragment, local);
				transition_in(tableheadcell4.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tableheadcell0.$$.fragment, local);
				transition_out(tableheadcell1.$$.fragment, local);
				transition_out(tableheadcell2.$$.fragment, local);
				transition_out(tableheadcell3.$$.fragment, local);
				transition_out(tableheadcell4.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tableheadcell0, detaching);
				destroy_component(tableheadcell1, detaching);
				destroy_component(tableheadcell2, detaching);
				destroy_component(tableheadcell3, detaching);
				destroy_component(tableheadcell4, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_15.name,
			type: "slot",
			source: "(142:4) <TableHead>",
			ctx
		});

		return block;
	}

	// (152:16) <TableBodyCell>
	function create_default_slot_14(ctx) {
		let t_value = /*request*/ ctx[21].requestId + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*requests*/ 16 && t_value !== (t_value = /*request*/ ctx[21].requestId + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_14.name,
			type: "slot",
			source: "(152:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (162:20) {:else}
	function create_else_block_2(ctx) {
		let t_value = (/*equipment*/ ctx[3].find(func)?.equipmentType || 'Unknown Member') + "";
		let t;

		function func(...args) {
			return /*func*/ ctx[15](/*request*/ ctx[21], ...args);
		}

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*equipment, requests*/ 24 && t_value !== (t_value = (/*equipment*/ ctx[3].find(func)?.equipmentType || 'Unknown Member') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_2.name,
			type: "else",
			source: "(162:20) {:else}",
			ctx
		});

		return block;
	}

	// (155:20) {#if editingState.requestId === request.requestId}
	function create_if_block_2$1(ctx) {
		let select;
		let option;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like_dev(/*equipment*/ ctx[3]);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				select = element("select");
				option = element("option");
				option.textContent = "Select a member";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$1, 176, 28, 6157);
				if (/*editingState*/ ctx[5].equipmentId === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[14].call(select));
				add_location(select, file$1, 175, 24, 6082);
			},
			m: function mount(target, anchor) {
				insert_dev(target, select, anchor);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*editingState*/ ctx[5].equipmentId, true);

				if (!mounted) {
					dispose = listen_dev(select, "change", /*select_change_handler_1*/ ctx[14]);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 8) {
					each_value_1 = ensure_array_like_dev(/*equipment*/ ctx[3]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}

				if (dirty & /*editingState, equipment*/ 40) {
					select_option(select, /*editingState*/ ctx[5].equipmentId);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(select);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(155:20) {#if editingState.requestId === request.requestId}",
			ctx
		});

		return block;
	}

	// (158:28) {#each equipment as equipmentItem}
	function create_each_block_1(ctx) {
		let option;
		let t_value = /*equipmentItem*/ ctx[24].equipmentType + "";
		let t;
		let option_value_value;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*equipmentItem*/ ctx[24].equipmentId;
				set_input_value(option, option.__value);
				add_location(option, file$1, 178, 32, 6303);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*equipment*/ 8 && t_value !== (t_value = /*equipmentItem*/ ctx[24].equipmentType + "")) set_data_dev(t, t_value);

				if (dirty & /*equipment*/ 8 && option_value_value !== (option_value_value = /*equipmentItem*/ ctx[24].equipmentId)) {
					prop_dev(option, "__value", option_value_value);
					set_input_value(option, option.__value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(158:28) {#each equipment as equipmentItem}",
			ctx
		});

		return block;
	}

	// (154:16) <TableBodyCell>
	function create_default_slot_13(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*editingState*/ ctx[5].requestId === /*request*/ ctx[21].requestId) return create_if_block_2$1;
			return create_else_block_2;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_13.name,
			type: "slot",
			source: "(154:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (172:16) {:else}
	function create_else_block_1(ctx) {
		let tablebodycell0;
		let t;
		let tablebodycell1;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_12] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_11] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t = space();
				create_component(tablebodycell1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(tablebodycell1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, requests*/ 536870928) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, requests*/ 536870928) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1.name,
			type: "else",
			source: "(172:16) {:else}",
			ctx
		});

		return block;
	}

	// (169:16) {#if editingState.requestId === request.requestId}
	function create_if_block_1$1(ctx) {
		let tablebodycell0;
		let t;
		let tablebodycell1;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_10] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_8$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t = space();
				create_component(tablebodycell1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(tablebodycell1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, editingState*/ 536870944) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, editingState*/ 536870944) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(169:16) {#if editingState.requestId === request.requestId}",
			ctx
		});

		return block;
	}

	// (173:20) <TableBodyCell>
	function create_default_slot_12(ctx) {
		let t_value = formatScheduleTime(/*request*/ ctx[21].requestDate) + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*requests*/ 16 && t_value !== (t_value = formatScheduleTime(/*request*/ ctx[21].requestDate) + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_12.name,
			type: "slot",
			source: "(173:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (174:20) <TableBodyCell>
	function create_default_slot_11(ctx) {
		let t_value = (/*request*/ ctx[21].resolved ? 'Yes' : 'No') + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*requests*/ 16 && t_value !== (t_value = (/*request*/ ctx[21].resolved ? 'Yes' : 'No') + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_11.name,
			type: "slot",
			source: "(174:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (170:20) <TableBodyCell>
	function create_default_slot_10(ctx) {
		let input;
		let updating_value;
		let current;

		function input_value_binding_1(value) {
			/*input_value_binding_1*/ ctx[16](value);
		}

		let input_props = { type: "datetime-local" };

		if (/*editingState*/ ctx[5].requestDate !== void 0) {
			input_props.value = /*editingState*/ ctx[5].requestDate;
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

		const block = {
			c: function create() {
				create_component(input.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const input_changes = {};

				if (!updating_value && dirty & /*editingState*/ 32) {
					updating_value = true;
					input_changes.value = /*editingState*/ ctx[5].requestDate;
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(input, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_10.name,
			type: "slot",
			source: "(170:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (171:35) <Checkbox bind:checked={editingState.resolved}>
	function create_default_slot_9(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Resolved");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_9.name,
			type: "slot",
			source: "(171:35) <Checkbox bind:checked={editingState.resolved}>",
			ctx
		});

		return block;
	}

	// (171:20) <TableBodyCell>
	function create_default_slot_8$1(ctx) {
		let checkbox;
		let updating_checked;
		let current;

		function checkbox_checked_binding_1(value) {
			/*checkbox_checked_binding_1*/ ctx[17](value);
		}

		let checkbox_props = {
			$$slots: { default: [create_default_slot_9] },
			$$scope: { ctx }
		};

		if (/*editingState*/ ctx[5].resolved !== void 0) {
			checkbox_props.checked = /*editingState*/ ctx[5].resolved;
		}

		checkbox = new Checkbox({ props: checkbox_props, $$inline: true });
		binding_callbacks.push(() => bind(checkbox, 'checked', checkbox_checked_binding_1));

		const block = {
			c: function create() {
				create_component(checkbox.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(checkbox, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const checkbox_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					checkbox_changes.$$scope = { dirty, ctx };
				}

				if (!updating_checked && dirty & /*editingState*/ 32) {
					updating_checked = true;
					checkbox_changes.checked = /*editingState*/ ctx[5].resolved;
					add_flush_callback(() => updating_checked = false);
				}

				checkbox.$set(checkbox_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(checkbox.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(checkbox.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(checkbox, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8$1.name,
			type: "slot",
			source: "(171:20) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (183:20) {:else}
	function create_else_block(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		function click_handler() {
			return /*click_handler*/ ctx[18](/*request*/ ctx[21]);
		}

		button0 = new Button({
				props: {
					color: "blue",
					$$slots: { default: [create_default_slot_7$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", click_handler);

		function click_handler_1() {
			return /*click_handler_1*/ ctx[19](/*request*/ ctx[21]);
		}

		button1 = new Button({
				props: {
					color: "red",
					$$slots: { default: [create_default_slot_6$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", click_handler_1);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const button0_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(183:20) {:else}",
			ctx
		});

		return block;
	}

	// (179:20) {#if editingState.requestId === request.requestId}
	function create_if_block$1(ctx) {
		let button0;
		let t;
		let button1;
		let current;

		button0 = new Button({
				props: {
					color: "green",
					$$slots: { default: [create_default_slot_5$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button0.$on("click", /*updateMaintenaceRequest*/ ctx[10]);

		button1 = new Button({
				props: {
					color: "light",
					$$slots: { default: [create_default_slot_4$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		button1.$on("click", /*stopEditing*/ ctx[9]);

		const block = {
			c: function create() {
				create_component(button0.$$.fragment);
				t = space();
				create_component(button1.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(button0, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(button1, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const button0_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					button0_changes.$$scope = { dirty, ctx };
				}

				button0.$set(button0_changes);
				const button1_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					button1_changes.$$scope = { dirty, ctx };
				}

				button1.$set(button1_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(button0.$$.fragment, local);
				transition_in(button1.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(button0.$$.fragment, local);
				transition_out(button1.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(button0, detaching);
				destroy_component(button1, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(179:20) {#if editingState.requestId === request.requestId}",
			ctx
		});

		return block;
	}

	// (185:24) <Button color="blue" on:click={() => startEditing(request.requestId, request.equipmentId, request.requestDate, request.resolved)}>
	function create_default_slot_7$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Edit");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7$1.name,
			type: "slot",
			source: "(185:24) <Button color=\\\"blue\\\" on:click={() => startEditing(request.requestId, request.equipmentId, request.requestDate, request.resolved)}>",
			ctx
		});

		return block;
	}

	// (186:24) <Button color="red" on:click={() => deleteRequest(request.requestId)}>
	function create_default_slot_6$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Delete");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6$1.name,
			type: "slot",
			source: "(186:24) <Button color=\\\"red\\\" on:click={() => deleteRequest(request.requestId)}>",
			ctx
		});

		return block;
	}

	// (181:24) <Button color="green" on:click={updateMaintenaceRequest}>
	function create_default_slot_5$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Save");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5$1.name,
			type: "slot",
			source: "(181:24) <Button color=\\\"green\\\" on:click={updateMaintenaceRequest}>",
			ctx
		});

		return block;
	}

	// (182:24) <Button color="light" on:click={stopEditing}>
	function create_default_slot_4$1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Cancel");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4$1.name,
			type: "slot",
			source: "(182:24) <Button color=\\\"light\\\" on:click={stopEditing}>",
			ctx
		});

		return block;
	}

	// (178:16) <TableBodyCell>
	function create_default_slot_3$1(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$1, create_else_block];
		const if_blocks = [];

		function select_block_type_2(ctx, dirty) {
			if (/*editingState*/ ctx[5].requestId === /*request*/ ctx[21].requestId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_2(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_2(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3$1.name,
			type: "slot",
			source: "(178:16) <TableBodyCell>",
			ctx
		});

		return block;
	}

	// (151:12) <TableBodyRow>
	function create_default_slot_2$1(ctx) {
		let tablebodycell0;
		let t0;
		let tablebodycell1;
		let t1;
		let current_block_type_index;
		let if_block;
		let t2;
		let tablebodycell2;
		let t3;
		let current;

		tablebodycell0 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_14] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebodycell1 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_13] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const if_block_creators = [create_if_block_1$1, create_else_block_1];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*editingState*/ ctx[5].requestId === /*request*/ ctx[21].requestId) return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		tablebodycell2 = new TableBodyCell({
				props: {
					$$slots: { default: [create_default_slot_3$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodycell0.$$.fragment);
				t0 = space();
				create_component(tablebodycell1.$$.fragment);
				t1 = space();
				if_block.c();
				t2 = space();
				create_component(tablebodycell2.$$.fragment);
				t3 = space();
			},
			m: function mount(target, anchor) {
				mount_component(tablebodycell0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tablebodycell1, target, anchor);
				insert_dev(target, t1, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tablebodycell2, target, anchor);
				insert_dev(target, t3, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodycell0_changes = {};

				if (dirty & /*$$scope, requests*/ 536870928) {
					tablebodycell0_changes.$$scope = { dirty, ctx };
				}

				tablebodycell0.$set(tablebodycell0_changes);
				const tablebodycell1_changes = {};

				if (dirty & /*$$scope, editingState, equipment, requests*/ 536870968) {
					tablebodycell1_changes.$$scope = { dirty, ctx };
				}

				tablebodycell1.$set(tablebodycell1_changes);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(t2.parentNode, t2);
				}

				const tablebodycell2_changes = {};

				if (dirty & /*$$scope, editingState, requests*/ 536870960) {
					tablebodycell2_changes.$$scope = { dirty, ctx };
				}

				tablebodycell2.$set(tablebodycell2_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodycell0.$$.fragment, local);
				transition_in(tablebodycell1.$$.fragment, local);
				transition_in(if_block);
				transition_in(tablebodycell2.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodycell0.$$.fragment, local);
				transition_out(tablebodycell1.$$.fragment, local);
				transition_out(if_block);
				transition_out(tablebodycell2.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablebodycell0, detaching);
				destroy_component(tablebodycell1, detaching);
				if_blocks[current_block_type_index].d(detaching);
				destroy_component(tablebodycell2, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2$1.name,
			type: "slot",
			source: "(151:12) <TableBodyRow>",
			ctx
		});

		return block;
	}

	// (150:8) {#each requests as request}
	function create_each_block(ctx) {
		let tablebodyrow;
		let current;

		tablebodyrow = new TableBodyRow({
				props: {
					$$slots: { default: [create_default_slot_2$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(tablebodyrow.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tablebodyrow, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablebodyrow_changes = {};

				if (dirty & /*$$scope, editingState, requests, equipment*/ 536870968) {
					tablebodyrow_changes.$$scope = { dirty, ctx };
				}

				tablebodyrow.$set(tablebodyrow_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablebodyrow.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablebodyrow.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(tablebodyrow, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(150:8) {#each requests as request}",
			ctx
		});

		return block;
	}

	// (149:4) <TableBody>
	function create_default_slot_1$1(ctx) {
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like_dev(/*requests*/ ctx[4]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*stopEditing, updateMaintenaceRequest, editingState, requests, deleteRequest, startEditing, equipment*/ 1976) {
					each_value = ensure_array_like_dev(/*requests*/ ctx[4]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1$1.name,
			type: "slot",
			source: "(149:4) <TableBody>",
			ctx
		});

		return block;
	}

	// (137:0) <Table class="mt-4">
	function create_default_slot$1(ctx) {
		let caption;
		let t0;
		let p;
		let t2;
		let tablehead;
		let t3;
		let tablebody;
		let current;

		tablehead = new TableHead({
				props: {
					$$slots: { default: [create_default_slot_15] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tablebody = new TableBody({
				props: {
					$$slots: { default: [create_default_slot_1$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				caption = element("caption");
				t0 = text("Maintenance Requests\n        ");
				p = element("p");
				p.textContent = "Here is a list of the current maintenance requests for gym equipment.";
				t2 = space();
				create_component(tablehead.$$.fragment);
				t3 = space();
				create_component(tablebody.$$.fragment);
				attr_dev(p, "class", "mt-1 text-sm font-normal text-gray-500 dark:text-gray-400");
				add_location(p, file$1, 159, 8, 5326);
				attr_dev(caption, "class", "p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800");
				add_location(caption, file$1, 157, 4, 5179);
			},
			m: function mount(target, anchor) {
				insert_dev(target, caption, anchor);
				append_dev(caption, t0);
				append_dev(caption, p);
				insert_dev(target, t2, anchor);
				mount_component(tablehead, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tablebody, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tablehead_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					tablehead_changes.$$scope = { dirty, ctx };
				}

				tablehead.$set(tablehead_changes);
				const tablebody_changes = {};

				if (dirty & /*$$scope, requests, editingState, equipment*/ 536870968) {
					tablebody_changes.$$scope = { dirty, ctx };
				}

				tablebody.$set(tablebody_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tablehead.$$.fragment, local);
				transition_in(tablebody.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tablehead.$$.fragment, local);
				transition_out(tablebody.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(caption);
					detach_dev(t2);
					detach_dev(t3);
				}

				destroy_component(tablehead, detaching);
				destroy_component(tablebody, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot$1.name,
			type: "slot",
			source: "(137:0) <Table class=\\\"mt-4\\\">",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let heading;
		let t0;
		let form;
		let div3;
		let div0;
		let label0;
		let t1;
		let select;
		let option;
		let t3;
		let div1;
		let label1;
		let t4;
		let input;
		let updating_value;
		let t5;
		let div2;
		let label2;
		let t6;
		let checkbox;
		let updating_checked;
		let t7;
		let button;
		let t8;
		let table;
		let current;
		let mounted;
		let dispose;

		heading = new Heading({
				props: {
					tag: "h2",
					class: "bg-white dark:bg-gray-800 p-5",
					$$slots: { default: [create_default_slot_26] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		label0 = new Label({
				props: {
					for: "equipmentId",
					class: "mb-2",
					$$slots: { default: [create_default_slot_25] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let each_value_2 = ensure_array_like_dev(/*equipment*/ ctx[3]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		label1 = new Label({
				props: {
					for: "requestDate",
					class: "mb-2",
					$$slots: { default: [create_default_slot_24] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function input_value_binding(value) {
			/*input_value_binding*/ ctx[12](value);
		}

		let input_props = {
			type: "date",
			id: "requestDate",
			required: true
		};

		if (/*requestDate*/ ctx[1] !== void 0) {
			input_props.value = /*requestDate*/ ctx[1];
		}

		input = new Input({ props: input_props, $$inline: true });
		binding_callbacks.push(() => bind(input, 'value', input_value_binding));

		label2 = new Label({
				props: {
					for: "resolved",
					class: "mb-2",
					$$slots: { default: [create_default_slot_23] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		function checkbox_checked_binding(value) {
			/*checkbox_checked_binding*/ ctx[13](value);
		}

		let checkbox_props = {
			id: "resolved",
			$$slots: { default: [create_default_slot_22] },
			$$scope: { ctx }
		};

		if (/*resolved*/ ctx[2] !== void 0) {
			checkbox_props.checked = /*resolved*/ ctx[2];
		}

		checkbox = new Checkbox({ props: checkbox_props, $$inline: true });
		binding_callbacks.push(() => bind(checkbox, 'checked', checkbox_checked_binding));

		button = new Button({
				props: {
					size: "lg",
					class: "w-32",
					type: "submit",
					color: "green",
					$$slots: { default: [create_default_slot_21] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		table = new Table({
				props: {
					class: "mt-4",
					$$slots: { default: [create_default_slot$1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(heading.$$.fragment);
				t0 = space();
				form = element("form");
				div3 = element("div");
				div0 = element("div");
				create_component(label0.$$.fragment);
				t1 = space();
				select = element("select");
				option = element("option");
				option.textContent = "Select equipment";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t3 = space();
				div1 = element("div");
				create_component(label1.$$.fragment);
				t4 = space();
				create_component(input.$$.fragment);
				t5 = space();
				div2 = element("div");
				create_component(label2.$$.fragment);
				t6 = space();
				create_component(checkbox.$$.fragment);
				t7 = space();
				create_component(button.$$.fragment);
				t8 = space();
				create_component(table.$$.fragment);
				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				add_location(option, file$1, 138, 16, 4426);
				attr_dev(select, "id", "equipmentId");
				select.required = true;
				if (/*equipmentId*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[11].call(select));
				add_location(select, file$1, 137, 12, 4350);
				add_location(div0, file$1, 135, 8, 4263);
				add_location(div1, file$1, 144, 8, 4699);
				add_location(div2, file$1, 148, 8, 4885);
				attr_dev(div3, "class", "grid gap-6 mb-6 md:grid-cols-2");
				add_location(div3, file$1, 134, 4, 4210);
				attr_dev(form, "id", "maintenanceRequestForm");
				attr_dev(form, "class", "bg-white dark:bg-gray-800 p-5");
				add_location(form, file$1, 133, 0, 4086);
			},
			l: function claim(nodes) {
				throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(heading, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, form, anchor);
				append_dev(form, div3);
				append_dev(div3, div0);
				mount_component(label0, div0, null);
				append_dev(div0, t1);
				append_dev(div0, select);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*equipmentId*/ ctx[0], true);
				append_dev(div3, t3);
				append_dev(div3, div1);
				mount_component(label1, div1, null);
				append_dev(div1, t4);
				mount_component(input, div1, null);
				append_dev(div3, t5);
				append_dev(div3, div2);
				mount_component(label2, div2, null);
				append_dev(div2, t6);
				mount_component(checkbox, div2, null);
				append_dev(form, t7);
				mount_component(button, form, null);
				insert_dev(target, t8, anchor);
				mount_component(table, target, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(select, "change", /*select_change_handler*/ ctx[11]),
						listen_dev(form, "submit", prevent_default(/*handleRequestSubmit*/ ctx[6]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const heading_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					heading_changes.$$scope = { dirty, ctx };
				}

				heading.$set(heading_changes);
				const label0_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					label0_changes.$$scope = { dirty, ctx };
				}

				label0.$set(label0_changes);

				if (dirty & /*equipment*/ 8) {
					each_value_2 = ensure_array_like_dev(/*equipment*/ ctx[3]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (dirty & /*equipmentId, equipment*/ 9) {
					select_option(select, /*equipmentId*/ ctx[0]);
				}

				const label1_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					label1_changes.$$scope = { dirty, ctx };
				}

				label1.$set(label1_changes);
				const input_changes = {};

				if (!updating_value && dirty & /*requestDate*/ 2) {
					updating_value = true;
					input_changes.value = /*requestDate*/ ctx[1];
					add_flush_callback(() => updating_value = false);
				}

				input.$set(input_changes);
				const label2_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					label2_changes.$$scope = { dirty, ctx };
				}

				label2.$set(label2_changes);
				const checkbox_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					checkbox_changes.$$scope = { dirty, ctx };
				}

				if (!updating_checked && dirty & /*resolved*/ 4) {
					updating_checked = true;
					checkbox_changes.checked = /*resolved*/ ctx[2];
					add_flush_callback(() => updating_checked = false);
				}

				checkbox.$set(checkbox_changes);
				const button_changes = {};

				if (dirty & /*$$scope*/ 536870912) {
					button_changes.$$scope = { dirty, ctx };
				}

				button.$set(button_changes);
				const table_changes = {};

				if (dirty & /*$$scope, requests, editingState, equipment*/ 536870968) {
					table_changes.$$scope = { dirty, ctx };
				}

				table.$set(table_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(heading.$$.fragment, local);
				transition_in(label0.$$.fragment, local);
				transition_in(label1.$$.fragment, local);
				transition_in(input.$$.fragment, local);
				transition_in(label2.$$.fragment, local);
				transition_in(checkbox.$$.fragment, local);
				transition_in(button.$$.fragment, local);
				transition_in(table.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(heading.$$.fragment, local);
				transition_out(label0.$$.fragment, local);
				transition_out(label1.$$.fragment, local);
				transition_out(input.$$.fragment, local);
				transition_out(label2.$$.fragment, local);
				transition_out(checkbox.$$.fragment, local);
				transition_out(button.$$.fragment, local);
				transition_out(table.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(form);
					detach_dev(t8);
				}

				destroy_component(heading, detaching);
				destroy_component(label0);
				destroy_each(each_blocks, detaching);
				destroy_component(label1);
				destroy_component(input);
				destroy_component(label2);
				destroy_component(checkbox);
				destroy_component(button);
				destroy_component(table, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('MaintenenceRequests', slots, []);
		let equipmentId;
		let requestDate = '';
		let resolved = false;
		let equipment = [];
		let requests = [];

		let editingState = {
			requestId: null,
			equipmentId: null,
			requestDate: null,
			resolved: undefined
		};

		onMount(async () => {
			try {
				$$invalidate(3, [equipment, requests] = await Promise.all([fetchEquipment(), fetchMaintenanceRequests()]), equipment, $$invalidate(4, requests));
			} catch(error) {
				console.error('Failed to fetch data:', error);
			}
		});

		async function submitMaintenenceRequest() {
			// Validation: Check if all required fields are filled
			if (!equipmentId || !requestDate) {
				console.error('All fields are required');
				return;
			}

			try {
				// Sending the POST request to the server
				const response = await fetch('/api/maintenanceRequests', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ equipmentId, requestDate, resolved })
				});

				if (!response.ok) {
					// Handling responses that are not 2xx
					throw new Error('Network response was not ok');
				}

				// Processing the successful response
				const result = await response.json();

				console.log('Maintenance request successful:', result);

				// Resetting form fields after successful submission
				$$invalidate(0, equipmentId = 0);

				$$invalidate(1, requestDate = '');
				$$invalidate(2, resolved = false);

				// Refreshing the list of member classes to include the new registration
				$$invalidate(4, requests = await fetchMaintenanceRequests());
			} catch(error) {
				// Handling any errors that occurred during the fetch operation
				console.error('Failed to submit maintenance request:', error);
			}
		}

		function handleRequestSubmit(event) {
			event.preventDefault();
			submitMaintenenceRequest();
		}

		async function deleteRequest(requestId) {
			const response = await fetch(`/api/maintenanceRequests/${requestId}`, { method: 'DELETE' });

			if (!response.ok) {
				console.error('Failed to delete maintenance request');
				return;
			}

			$$invalidate(4, requests = await fetchMaintenanceRequests());
		}

		function startEditing(requestId, equipmentId, requestDate, resolved) {
			$$invalidate(5, editingState = {
				requestId,
				equipmentId,
				requestDate,
				resolved
			});
		}

		function stopEditing() {
			$$invalidate(5, editingState = {
				requestId: null,
				equipmentId: null,
				requestDate: null,
				resolved: undefined
			});
		}

		// Function to handle editing of instructor classes
		// Function to handle editing of instructor classes
		async function updateMaintenaceRequest() {
			if (!editingState.requestId) {
				console.error('Request ID is required');
				return;
			}

			try {
				const response = await fetch(`/api/maintenanceRequests/${editingState.requestId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						equipmentId: editingState.equipmentId,
						requestDate: editingState.requestDate,
						resolved: editingState.resolved
					})
				});

				if (!response.ok) {
					throw new Error('Network response was not ok');
				}

				console.log('Maintenance request update successful');
				stopEditing(); // Reset editing state
				$$invalidate(4, requests = await fetchMaintenanceRequests()); // Refresh list
			} catch(error) {
				console.error('Failed to update the maintenance request:', error);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<MaintenenceRequests> was created with unknown prop '${key}'`);
		});

		function select_change_handler() {
			equipmentId = select_value(this);
			$$invalidate(0, equipmentId);
			$$invalidate(3, equipment);
		}

		function input_value_binding(value) {
			requestDate = value;
			$$invalidate(1, requestDate);
		}

		function checkbox_checked_binding(value) {
			resolved = value;
			$$invalidate(2, resolved);
		}

		function select_change_handler_1() {
			editingState.equipmentId = select_value(this);
			$$invalidate(5, editingState);
			$$invalidate(3, equipment);
		}

		const func = (request, e) => e.equipmentId === request.equipmentId;

		function input_value_binding_1(value) {
			if ($$self.$$.not_equal(editingState.requestDate, value)) {
				editingState.requestDate = value;
				$$invalidate(5, editingState);
			}
		}

		function checkbox_checked_binding_1(value) {
			if ($$self.$$.not_equal(editingState.resolved, value)) {
				editingState.resolved = value;
				$$invalidate(5, editingState);
			}
		}

		const click_handler = request => startEditing(request.requestId, request.equipmentId, request.requestDate, request.resolved);
		const click_handler_1 = request => deleteRequest(request.requestId);

		$$self.$capture_state = () => ({
			onMount,
			Checkbox,
			Button,
			Input,
			Label,
			Table,
			TableBody,
			TableBodyCell,
			TableBodyRow,
			TableHead,
			TableHeadCell,
			Helper,
			Heading,
			fetchMaintenanceRequests,
			formatScheduleTime,
			fetchEquipment,
			equipmentId,
			requestDate,
			resolved,
			equipment,
			requests,
			editingState,
			submitMaintenenceRequest,
			handleRequestSubmit,
			deleteRequest,
			startEditing,
			stopEditing,
			updateMaintenaceRequest
		});

		$$self.$inject_state = $$props => {
			if ('equipmentId' in $$props) $$invalidate(0, equipmentId = $$props.equipmentId);
			if ('requestDate' in $$props) $$invalidate(1, requestDate = $$props.requestDate);
			if ('resolved' in $$props) $$invalidate(2, resolved = $$props.resolved);
			if ('equipment' in $$props) $$invalidate(3, equipment = $$props.equipment);
			if ('requests' in $$props) $$invalidate(4, requests = $$props.requests);
			if ('editingState' in $$props) $$invalidate(5, editingState = $$props.editingState);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			equipmentId,
			requestDate,
			resolved,
			equipment,
			requests,
			editingState,
			handleRequestSubmit,
			deleteRequest,
			startEditing,
			stopEditing,
			updateMaintenaceRequest,
			select_change_handler,
			input_value_binding,
			checkbox_checked_binding,
			select_change_handler_1,
			func,
			input_value_binding_1,
			checkbox_checked_binding_1,
			click_handler,
			click_handler_1
		];
	}

	class MaintenenceRequests extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "MaintenenceRequests",
				options,
				id: create_fragment$1.name
			});
		}
	}

	/* src/App.svelte generated by Svelte v4.2.12 */
	const file = "src/App.svelte";

	// (14:4) {#if activeTab === 'Classes'}
	function create_if_block_7(ctx) {
		let classes;
		let current;
		classes = new Classes({ $$inline: true });

		const block = {
			c: function create() {
				create_component(classes.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(classes, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(classes.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(classes.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(classes, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_7.name,
			type: "if",
			source: "(14:4) {#if activeTab === 'Classes'}",
			ctx
		});

		return block;
	}

	// (13:2) <TabItem title="Classes" on:click={() => activeTab = 'Classes'}>
	function create_default_slot_8(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Classes' && create_if_block_7(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Classes') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_7(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_8.name,
			type: "slot",
			source: "(13:2) <TabItem title=\\\"Classes\\\" on:click={() => activeTab = 'Classes'}>",
			ctx
		});

		return block;
	}

	// (17:4) {#if activeTab === 'MemberClasses'}
	function create_if_block_6(ctx) {
		let memberclasses;
		let current;
		memberclasses = new MemberClasses({ $$inline: true });

		const block = {
			c: function create() {
				create_component(memberclasses.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(memberclasses, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(memberclasses.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(memberclasses.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(memberclasses, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_6.name,
			type: "if",
			source: "(17:4) {#if activeTab === 'MemberClasses'}",
			ctx
		});

		return block;
	}

	// (16:2) <TabItem title="Member Classes" on:click={() => activeTab = 'MemberClasses'}>
	function create_default_slot_7(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'MemberClasses' && create_if_block_6(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'MemberClasses') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_6(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_7.name,
			type: "slot",
			source: "(16:2) <TabItem title=\\\"Member Classes\\\" on:click={() => activeTab = 'MemberClasses'}>",
			ctx
		});

		return block;
	}

	// (20:4) {#if activeTab === 'Equipment'}
	function create_if_block_5(ctx) {
		let equipment;
		let current;
		equipment = new Equipment({ $$inline: true });

		const block = {
			c: function create() {
				create_component(equipment.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(equipment, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(equipment.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(equipment.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(equipment, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5.name,
			type: "if",
			source: "(20:4) {#if activeTab === 'Equipment'}",
			ctx
		});

		return block;
	}

	// (19:2) <TabItem title="Equipment" on:click={() => activeTab = 'Equipment'}>
	function create_default_slot_6(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Equipment' && create_if_block_5(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Equipment') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_5(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_6.name,
			type: "slot",
			source: "(19:2) <TabItem title=\\\"Equipment\\\" on:click={() => activeTab = 'Equipment'}>",
			ctx
		});

		return block;
	}

	// (23:4) {#if activeTab === 'Members'}
	function create_if_block_4(ctx) {
		let members;
		let current;
		members = new Members({ $$inline: true });

		const block = {
			c: function create() {
				create_component(members.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(members, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(members.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(members.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(members, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(23:4) {#if activeTab === 'Members'}",
			ctx
		});

		return block;
	}

	// (22:2) <TabItem title="Members" on:click={() => activeTab = 'Members'}>
	function create_default_slot_5(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Members' && create_if_block_4(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Members') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_4(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_5.name,
			type: "slot",
			source: "(22:2) <TabItem title=\\\"Members\\\" on:click={() => activeTab = 'Members'}>",
			ctx
		});

		return block;
	}

	// (26:4) {#if activeTab === 'Instructors'}
	function create_if_block_3(ctx) {
		let instructors;
		let current;
		instructors = new Instructors({ $$inline: true });

		const block = {
			c: function create() {
				create_component(instructors.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(instructors, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(instructors.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(instructors.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(instructors, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(26:4) {#if activeTab === 'Instructors'}",
			ctx
		});

		return block;
	}

	// (25:2) <TabItem title="Instructors" on:click={() => activeTab = 'Instructors'}>
	function create_default_slot_4(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Instructors' && create_if_block_3(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Instructors') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_3(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_4.name,
			type: "slot",
			source: "(25:2) <TabItem title=\\\"Instructors\\\" on:click={() => activeTab = 'Instructors'}>",
			ctx
		});

		return block;
	}

	// (29:4) {#if activeTab === 'Class Instructors'}
	function create_if_block_2(ctx) {
		let classinstructors;
		let current;
		classinstructors = new ClassInstructors({ $$inline: true });

		const block = {
			c: function create() {
				create_component(classinstructors.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(classinstructors, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(classinstructors.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(classinstructors.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(classinstructors, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(29:4) {#if activeTab === 'Class Instructors'}",
			ctx
		});

		return block;
	}

	// (28:2) <TabItem title="Class Instructors" on:click={() => activeTab = 'Class Instructors'}>
	function create_default_slot_3(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Class Instructors' && create_if_block_2(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Class Instructors') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_2(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_3.name,
			type: "slot",
			source: "(28:2) <TabItem title=\\\"Class Instructors\\\" on:click={() => activeTab = 'Class Instructors'}>",
			ctx
		});

		return block;
	}

	// (32:4) {#if activeTab === 'Maintenance Requests'}
	function create_if_block_1(ctx) {
		let maintenencerequests;
		let current;
		maintenencerequests = new MaintenenceRequests({ $$inline: true });

		const block = {
			c: function create() {
				create_component(maintenencerequests.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(maintenencerequests, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(maintenencerequests.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(maintenencerequests.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(maintenencerequests, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(32:4) {#if activeTab === 'Maintenance Requests'}",
			ctx
		});

		return block;
	}

	// (31:2) <TabItem title="Maintenance Requests" on:click={() => activeTab = 'Maintenance Requests'}>
	function create_default_slot_2(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*activeTab*/ ctx[0] === 'Maintenance Requests' && create_if_block_1(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*activeTab*/ ctx[0] === 'Maintenance Requests') {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_1(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_2.name,
			type: "slot",
			source: "(31:2) <TabItem title=\\\"Maintenance Requests\\\" on:click={() => activeTab = 'Maintenance Requests'}>",
			ctx
		});

		return block;
	}

	// (12:0) <Tabs>
	function create_default_slot_1(ctx) {
		let tabitem0;
		let t0;
		let tabitem1;
		let t1;
		let tabitem2;
		let t2;
		let tabitem3;
		let t3;
		let tabitem4;
		let t4;
		let tabitem5;
		let t5;
		let tabitem6;
		let current;

		tabitem0 = new TabItem({
				props: {
					title: "Classes",
					$$slots: { default: [create_default_slot_8] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem0.$on("click", /*click_handler*/ ctx[1]);

		tabitem1 = new TabItem({
				props: {
					title: "Member Classes",
					$$slots: { default: [create_default_slot_7] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem1.$on("click", /*click_handler_1*/ ctx[2]);

		tabitem2 = new TabItem({
				props: {
					title: "Equipment",
					$$slots: { default: [create_default_slot_6] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem2.$on("click", /*click_handler_2*/ ctx[3]);

		tabitem3 = new TabItem({
				props: {
					title: "Members",
					$$slots: { default: [create_default_slot_5] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem3.$on("click", /*click_handler_3*/ ctx[4]);

		tabitem4 = new TabItem({
				props: {
					title: "Instructors",
					$$slots: { default: [create_default_slot_4] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem4.$on("click", /*click_handler_4*/ ctx[5]);

		tabitem5 = new TabItem({
				props: {
					title: "Class Instructors",
					$$slots: { default: [create_default_slot_3] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem5.$on("click", /*click_handler_5*/ ctx[6]);

		tabitem6 = new TabItem({
				props: {
					title: "Maintenance Requests",
					$$slots: { default: [create_default_slot_2] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		tabitem6.$on("click", /*click_handler_6*/ ctx[7]);

		const block = {
			c: function create() {
				create_component(tabitem0.$$.fragment);
				t0 = space();
				create_component(tabitem1.$$.fragment);
				t1 = space();
				create_component(tabitem2.$$.fragment);
				t2 = space();
				create_component(tabitem3.$$.fragment);
				t3 = space();
				create_component(tabitem4.$$.fragment);
				t4 = space();
				create_component(tabitem5.$$.fragment);
				t5 = space();
				create_component(tabitem6.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(tabitem0, target, anchor);
				insert_dev(target, t0, anchor);
				mount_component(tabitem1, target, anchor);
				insert_dev(target, t1, anchor);
				mount_component(tabitem2, target, anchor);
				insert_dev(target, t2, anchor);
				mount_component(tabitem3, target, anchor);
				insert_dev(target, t3, anchor);
				mount_component(tabitem4, target, anchor);
				insert_dev(target, t4, anchor);
				mount_component(tabitem5, target, anchor);
				insert_dev(target, t5, anchor);
				mount_component(tabitem6, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const tabitem0_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem0_changes.$$scope = { dirty, ctx };
				}

				tabitem0.$set(tabitem0_changes);
				const tabitem1_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem1_changes.$$scope = { dirty, ctx };
				}

				tabitem1.$set(tabitem1_changes);
				const tabitem2_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem2_changes.$$scope = { dirty, ctx };
				}

				tabitem2.$set(tabitem2_changes);
				const tabitem3_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem3_changes.$$scope = { dirty, ctx };
				}

				tabitem3.$set(tabitem3_changes);
				const tabitem4_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem4_changes.$$scope = { dirty, ctx };
				}

				tabitem4.$set(tabitem4_changes);
				const tabitem5_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem5_changes.$$scope = { dirty, ctx };
				}

				tabitem5.$set(tabitem5_changes);
				const tabitem6_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabitem6_changes.$$scope = { dirty, ctx };
				}

				tabitem6.$set(tabitem6_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tabitem0.$$.fragment, local);
				transition_in(tabitem1.$$.fragment, local);
				transition_in(tabitem2.$$.fragment, local);
				transition_in(tabitem3.$$.fragment, local);
				transition_in(tabitem4.$$.fragment, local);
				transition_in(tabitem5.$$.fragment, local);
				transition_in(tabitem6.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(tabitem0.$$.fragment, local);
				transition_out(tabitem1.$$.fragment, local);
				transition_out(tabitem2.$$.fragment, local);
				transition_out(tabitem3.$$.fragment, local);
				transition_out(tabitem4.$$.fragment, local);
				transition_out(tabitem5.$$.fragment, local);
				transition_out(tabitem6.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
					detach_dev(t5);
				}

				destroy_component(tabitem0, detaching);
				destroy_component(tabitem1, detaching);
				destroy_component(tabitem2, detaching);
				destroy_component(tabitem3, detaching);
				destroy_component(tabitem4, detaching);
				destroy_component(tabitem5, detaching);
				destroy_component(tabitem6, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot_1.name,
			type: "slot",
			source: "(12:0) <Tabs>",
			ctx
		});

		return block;
	}

	// (38:2) {#if activeTab === null}
	function create_if_block(ctx) {
		let card;
		let current;

		card = new Card({
				props: {
					class: "max-w-4xl mx-auto",
					$$slots: { default: [create_default_slot] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(card.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(card, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(card.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(card.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(card, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(38:2) {#if activeTab === null}",
			ctx
		});

		return block;
	}

	// (39:4) <Card class="max-w-4xl mx-auto">
	function create_default_slot(ctx) {
		let h2;
		let t1;
		let p;

		const block = {
			c: function create() {
				h2 = element("h2");
				h2.textContent = "Welcome to the Gym Database Management System";
				t1 = space();
				p = element("p");
				p.textContent = "Please click on one of the tabs above to begin managing the database.";
				attr_dev(h2, "class", "text-2xl font-bold text-center mb-4");
				add_location(h2, file, 42, 6, 1808);
				attr_dev(p, "class", "mb-4 text-center");
				add_location(p, file, 43, 6, 1913);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h2, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, p, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h2);
					detach_dev(t1);
					detach_dev(p);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_default_slot.name,
			type: "slot",
			source: "(39:4) <Card class=\\\"max-w-4xl mx-auto\\\">",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let tabs;
		let t;
		let div;
		let current;

		tabs = new Tabs({
				props: {
					$$slots: { default: [create_default_slot_1] },
					$$scope: { ctx }
				},
				$$inline: true
			});

		let if_block = /*activeTab*/ ctx[0] === null && create_if_block(ctx);

		const block = {
			c: function create() {
				create_component(tabs.$$.fragment);
				t = space();
				div = element("div");
				if (if_block) if_block.c();
				attr_dev(div, "class", "mt-4 px-4");
				add_location(div, file, 39, 0, 1714);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(tabs, target, anchor);
				insert_dev(target, t, anchor);
				insert_dev(target, div, anchor);
				if (if_block) if_block.m(div, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const tabs_changes = {};

				if (dirty & /*$$scope, activeTab*/ 257) {
					tabs_changes.$$scope = { dirty, ctx };
				}

				tabs.$set(tabs_changes);

				if (/*activeTab*/ ctx[0] === null) {
					if (if_block) {
						if (dirty & /*activeTab*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(tabs.$$.fragment, local);
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(tabs.$$.fragment, local);
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
					detach_dev(div);
				}

				destroy_component(tabs, detaching);
				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let activeTab = null;
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
		});

		const click_handler = () => $$invalidate(0, activeTab = 'Classes');
		const click_handler_1 = () => $$invalidate(0, activeTab = 'MemberClasses');
		const click_handler_2 = () => $$invalidate(0, activeTab = 'Equipment');
		const click_handler_3 = () => $$invalidate(0, activeTab = 'Members');
		const click_handler_4 = () => $$invalidate(0, activeTab = 'Instructors');
		const click_handler_5 = () => $$invalidate(0, activeTab = 'Class Instructors');
		const click_handler_6 = () => $$invalidate(0, activeTab = 'Maintenance Requests');

		$$self.$capture_state = () => ({
			Tabs,
			TabItem,
			Card,
			Button,
			Classes,
			MemberClasses,
			Equipment,
			Members,
			Instructors,
			ClassInstructors,
			MaintenenceRequests,
			activeTab
		});

		$$self.$inject_state = $$props => {
			if ('activeTab' in $$props) $$invalidate(0, activeTab = $$props.activeTab);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			activeTab,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			click_handler_5,
			click_handler_6
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
	    target: document.body,
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
