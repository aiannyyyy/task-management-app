# Task Management App

A full-stack MERN application for managing tasks with drag-and-drop functionality, built with Docker.

## Features

- ✅ Create, Read, Update, Delete tasks
- ✅ Drag and drop tasks between columns
- ✅ Filter tasks by status
- ✅ Search functionality
- ✅ Dark mode support
- ✅ Responsive design

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS
- @dnd-kit (drag and drop)
- Axios

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- RESTful API

**DevOps:**
- Docker & Docker Compose

## Prerequisites

- Docker Desktop
- Node.js 18+ (for local development)
- Git

## Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/task-management-app.git
cd task-management-app
```

### 2. Setup environment variables

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and add your values
```

**Frontend:**
```bash
cd ../frontend
cp .env.example .env
# Edit .env and add your values
```

### 3. Run with Docker
```bash
# From the root directory
docker-compose up -d --build
```

### 4. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: mongodb://localhost:27017

## Development

### Start development servers
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop containers
```bash
docker-compose down
```

## Project Structure
```
mern-app/
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── .env.example
│   ├── Dockerfile
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License

## Author

https://github.com/aiannyyyy