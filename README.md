# Gym Database Management Web App

## Overview
This web app is a Gym Database Management system designed to facilitate the management of gym-related data. Built with Svelte, it offers a sleek user interface for performing Create, Read, Update, and Delete (CRUD) operations on a MySQL database. The backend is powered by Express, providing a robust API for data manipulation.

## Features
- **Manage Members**: Add, view, update, and delete gym members.
- **Class Scheduling**: Organize and manage fitness classes, including schedules, instructors, and attendance.
- **Equipment Tracking**: Keep track of gym equipment, including maintenance schedules and usage.
- **Instructor Management**: Manage instructor profiles and class assignments.

## Getting Started

### Prerequisites
- Node.js
- MySQL

### Installation
1. Clone the repository:
git clone <https://github.com/kpfister44/gym-database-ui.git>

2. Install dependencies:
npm install

3. Set up the MySQL database:
   - Create a database named `gym_management`.
   - Import the provided SQL schema located in `database/schema.sql`.

4. Configure environment variables if need be:
   - Update the database connection settings in `.env`.

5. Start the application:
    - For development:
    npm run dev
    - For production:
    npm run build
    npm start

## Usage
Navigate to `http://localhost:5516` (or your configured port) to access the Gym Database Management web app. From the dashboard, you can select different sections like Members, Classes, Equipment, and Instructors to perform various operations.

## Screenshots
The main dashboard of the web app:
![Dashboard](https://github.com/kpfister44/gym-database-ui/blob/main/screenshots/dashboard.png "Dashboard View")

The class management screen, with the tab in view
![Class Management](https://github.com/kpfister44/gym-database-ui/blob/main/screenshots/classes.png "Class Management")

The equipment management screen, with the tab not in view but more of the datatable showing:
![Equipment Management](https://github.com/kpfister44/gym-database-ui/blob/main/screenshots/equipment.png "Equipment Management")

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

## License
This project is licensed under the MIT License - see the file for details.
