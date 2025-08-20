# Team Chat Application with AI Integration

## Overview

This is a real-time team chat application built with React and Express that integrates with the Qwen 3 MoE AI assistant. The application provides a modern messaging interface where team members can communicate with each other and interact with an AI assistant for help and automation. The application now includes comprehensive file upload and sharing capabilities for images, videos, audio files, and documents.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern React application using functional components and hooks
- **Vite Build System**: Fast development server and optimized production builds
- **Wouter Routing**: Lightweight client-side routing solution
- **TanStack Query**: Server state management for data fetching and caching
- **shadcn/ui Components**: Pre-built, accessible UI components with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for responsive design

### Backend Architecture
- **Express.js Server**: RESTful API with middleware for logging and error handling
- **WebSocket Support**: Real-time communication using WebSocket connections for live messaging
- **PostgreSQL Storage**: Production-ready database storage with automatic fallback to in-memory storage for development
- **Modular Route System**: Organized API endpoints for users and messages

### Database Design
- **Drizzle ORM**: Type-safe database toolkit configured for PostgreSQL
- **Schema Design**: Well-defined tables for users and messages with proper relationships, including file attachment support
- **File Attachment Storage**: Messages can contain multiple file attachments with metadata (URLs, types, original names)
- **Automatic Storage Selection**: Uses PostgreSQL when DATABASE_URL is available, falls back to memory storage otherwise
- **Migration Support**: Database schema versioning through Drizzle migrations

### Real-Time Communication
- **WebSocket Integration**: Bidirectional communication between client and server
- **Connection Management**: Automatic reconnection with exponential backoff
- **User Presence**: Online/offline status tracking for team members

### UI/UX Architecture
- **Component-Based Design**: Reusable chat components (Sidebar, MessageList, MessageInput) with file upload capabilities
- **File Upload Interface**: Drag-and-drop and click-to-upload functionality with preview
- **Media Display**: Inline display of images, videos, and audio with download options for documents
- **Responsive Layout**: Mobile-first design with collapsible sidebar
- **Accessibility**: ARIA labels and keyboard navigation support
- **Theme System**: CSS custom properties for consistent cyberpunk styling

### State Management
- **React Query**: Server state caching and synchronization
- **Local React State**: Component-level state for UI interactions
- **WebSocket State**: Real-time message updates through WebSocket events

## External Dependencies

### Core Technologies
- **Neon Database**: Serverless PostgreSQL database provider
- **Qwen3-235B-A22B**: Latest flagship MoE AI model (235B total parameters, 22B active) with dual-mode operation for AI assistant features

### UI Libraries
- **Radix UI**: Unstyled, accessible components for complex UI patterns
- **Lucide React**: Modern icon library with consistent design
- **Embla Carousel**: Touch-friendly carousel component

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Static type checking and enhanced developer experience
- **PostCSS**: CSS processing with Tailwind CSS integration

### Runtime Libraries
- **React Hook Form**: Form validation and management
- **Date-fns**: Modern date utility library
- **Zod**: Runtime type validation for API schemas
- **Class Variance Authority**: Utility for creating component variants
- **Multer**: File upload handling middleware for Express server

### WebSocket & Networking
- **WebSocket (ws)**: Server-side WebSocket implementation
- **Connect-pg-simple**: PostgreSQL session store for Express

