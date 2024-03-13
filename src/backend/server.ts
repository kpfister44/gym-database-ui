import express from 'express';
import path from 'path';
import classesRoutes from './routes/classes'; 
import membersRoutes from './routes/members'; 
import instructorsRoutes from './routes/instructors'; 
import equipmentRoutes from './routes/equipment'; 
import maintenanceRequestsRoutes from './routes/maintenanceRequests'; 
import classInstructorsRoutes from './routes/classInstructors'; 
import memberClassesRoutes from './routes/memberClasses';

const app = express();
const PORT = 5516;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'public', 'build')));

// Use the classes routes with a base path
app.use('/api/classes', classesRoutes);
// Use the members routes with a base path
app.use('/api/members', membersRoutes);
// Use the instructors routes with a base path
app.use('/api/instructors', instructorsRoutes);
// Use the equipment routes with a base path
app.use('/api/equipment', equipmentRoutes);
// Use the maintenance requests routes with a base path
app.use('/api/maintenanceRequests', maintenanceRequestsRoutes);
// Use the class instructors routes with a base path
app.use('/api/classInstructors', classInstructorsRoutes);
// Use the member classes routes with a base path
app.use('/api/memberClasses', memberClassesRoutes);

// Client-side routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});