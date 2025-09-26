# Film Scout Backend

The Film Scout Backend is a flexible and robust API service that powers the Film Scout platform, providing data and services for film production scouting and related information.

## 🚀 Features

- **RESTful API**: Serves film production data, neighborhood information, and related media
- **AI-Powered Inference**: Uses OpenAI for intelligent data enrichment and insights
- **Image Proxy & Management**: Handles actor images, production logos, and news media
- **Flexible Database Configuration**: Supports various deployment scenarios with configurable database connections
- **Health Check Endpoints**: Mobile-friendly status page for system monitoring
- **Docker Support**: Easy containerization for deployment flexibility

## 🔧 Technology Stack

- Node.js with Express.js
- MySQL/MariaDB for data storage
- OpenAI API integration
- Docker containerization
- CORS support for cross-origin requests
- Environment-based configuration

## 🏗️ Architecture

The Film Scout Backend follows a modular design with clear separation of concerns:

- **Routes**: API endpoints organized by feature in the `routes/` directory
- **Configuration**: Database and other settings in the `config/` directory
- **Middleware**: Express middleware for request processing
- **Static Assets**

### API Design

The backend exposes a set of RESTful endpoints for different data needs:

- Production data queries
- Neighborhood suggestions
- Image and media retrieval
- AI inference services

## 📱 Mobile-Ready Design

The architecture is designed to support both web and native mobile applications:

- **Clean API Boundaries**: Clearly defined endpoints that can serve any client type
- **Stateless Design**: Follows stateless principles for easy scalability
- **Optimized Responses**: Data payloads structured efficiently for mobile consumption
- **Health Check UI**: Mobile-friendly status page for monitoring service health

## 🚢 Deployment Options

### Local Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t film-scout-backend .

# Run the container
docker run -p 4000:4000 -e DB_HOST=your-db-host film-scout-backend
```

### Docker Compose

Use the provided Docker Compose configuration in the `film-scout-docker` directory:

```bash
cd ../film-scout-docker
docker-compose up
```

## ⚙️ Environment Configuration

Configure the application using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 3306 |
| DB_USER | Database username | root |
| DB_PASSWORD | Database password | |
| DB_NAME | Database name | |
| OPENAI_API_KEY | OpenAI API key | |
| GOOGLE_CUSTOM_SEARCH_CX_ID | Google Custom Search CX ID | |

## 🌐 API Endpoints

### Core Endpoints

- `GET /events`: Retrieve film production events with optional filtering
- `GET /neighborhoods`: Get available neighborhoods with event counts
- `GET /suggested-neighborhoods`: Get neighborhood suggestions based on query

### AI-Powered Inference

- `POST /infer-production`: Infer details about a production
- `POST /infer-actors`: Infer information about actors
- `POST /infer-unknown`: General inference endpoint for unclassified data

### Media and Images

- `GET /actor-image`: Retrieve actor images
- `GET /production-teaser`: Get production teasers
- `GET /news-images`: Get news-related images
- `GET /curated-images`: Retrieve curated images
- `GET /proxy-image`: Proxy for external image sources

## 🔄 Integration with Frontend

The backend is designed to work seamlessly with the Film Scout frontend, providing all necessary data and services through its API endpoints. It can be deployed separately or alongside the frontend, depending on deployment strategy.

## 📝 License

MIT

---

*This backend is designed with flexible deployment in mind and can support both web and native mobile app clients through its clean API design.*