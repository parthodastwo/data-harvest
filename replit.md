# Healthcare Data Extraction Platform

## Overview

This is a full-stack healthcare data extraction platform built with React/TypeScript frontend and Express/Node.js backend. The application provides authenticated users with the ability to configure, execute, and monitor healthcare data extractions from various sources like Electronic Health Records (EHR), claims databases, patient registries, and laboratory systems.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom healthcare-themed design tokens
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API Design**: RESTful API endpoints with proper error handling middleware

## Key Components

### Authentication System
- JWT token-based authentication with secure password hashing using bcrypt
- User registration and login with validation using Zod schemas
- Password change functionality with current password verification
- Token storage in localStorage with automatic token refresh
- Protected routes with authentication middleware

### Data Extraction Engine
- Support for multiple data sources (EHR, Claims, Registry, Lab systems)
- Configurable extraction parameters including patient criteria and data formats
- PHI (Protected Health Information) handling with anonymization options
- Status tracking for extraction jobs (pending, processing, completed)
- Configuration templates for reusable extraction setups

### User Interface
- Responsive dashboard with healthcare-themed color scheme
- Real-time metrics display (total extractions, success rates, data processed)
- Quick action buttons for common operations
- Recent extractions and activity feed
- Configuration panel for setting up new extractions

### Database Schema
- **Users**: User accounts with role-based access control
- **Data Extractions**: Extraction job records with status and configuration
- **Extraction Configurations**: Reusable templates for data extraction parameters

## Data Flow

1. **User Authentication**: Users register/login through secure forms with JWT token generation
2. **Dashboard Access**: Authenticated users access the main dashboard with metrics and quick actions
3. **Configuration Setup**: Users create extraction configurations specifying data sources, criteria, and formats
4. **Extraction Execution**: Users trigger data extractions based on saved configurations
5. **Status Monitoring**: Real-time updates on extraction progress and completion status
6. **Results Access**: Completed extractions available for download or further processing

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **@hookform/resolvers**: Form validation integration
- **wouter**: Lightweight routing library
- **zod**: Schema validation library
- **date-fns**: Date manipulation utilities

### Backend Dependencies
- **@neondatabase/serverless**: Neon database client for serverless PostgreSQL
- **drizzle-orm**: Type-safe ORM for database operations
- **bcrypt**: Password hashing and verification
- **jsonwebtoken**: JWT token generation and verification
- **express**: Web application framework
- **zod**: Schema validation and type safety

### Development Dependencies
- **TypeScript**: Type safety across the entire application
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- Express server with automatic restart on changes
- Database migrations handled by Drizzle Kit
- Environment variables for database connection and JWT secrets

### Production Build
- Frontend built with Vite and served as static files
- Backend bundled with ESBuild for Node.js runtime
- Single-command deployment with `npm run build`
- Environment-specific configuration through environment variables

### Database Management
- PostgreSQL database hosted on Neon (serverless)
- Schema migrations managed through Drizzle Kit
- Connection pooling for efficient database access
- Automatic scaling based on usage patterns

Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Added user management functionality with admin role controls for creating users, changing passwords, and managing user status
- July 02, 2025. Added Data Systems and Data Sources management with full CRUD operations, admin-only access, and hierarchical navigation
- July 03, 2025. Simplified Data Systems by removing connection string field
- July 03, 2025. Recreated Data Sources with updated schema (dataSystemId, name, description, filename, activeFlag, isMaster, attributes)
- July 03, 2025. Added comprehensive validation for mandatory fields (name for Data Systems, name/filename/dataSystemId for Data Sources)
- July 03, 2025. Implemented referential integrity protection - prevents deleting Data Systems with associated Data Sources
- July 03, 2025. Added Data Source Attributes management with dedicated table and full CRUD operations
- July 03, 2025. Implemented master-details layout for Data Source details with scrollable attributes section
- July 03, 2025. Removed attributes JSON field from Data Sources table - now using dedicated dataSourceAttributes table
- July 03, 2025. Added CSV upload functionality for bulk attribute creation with automatic data type inference
- July 03, 2025. Fixed scrolling layout in data source details - header stays visible, attributes section scrolls independently
- July 03, 2025. Updated attributes display to show "Reference" instead of "Standard" for non-master data sources
- July 03, 2025. Improved attributes section spacing and made scrollbar always visible
- July 03, 2025. Added Cross References feature with full CRUD operations for managing attribute mappings between data sources
- July 03, 2025. Implemented Cross Reference details page with master-details layout and mapping management functionality
- July 03, 2025. Added validation to prevent mapping source and target data sources to the same data source
- July 05, 2025. Added Data Extraction feature with data system selection, dynamic CSV upload fields based on active data sources, and secure file upload functionality with authentication

## User Preferences

Preferred communication style: Simple, everyday language.