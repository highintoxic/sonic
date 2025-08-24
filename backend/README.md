# Shazam Clone Backend

A complete Shazam clone backend that can identify songs from audio clips using acoustic fingerprinting technology. Built with Node.js, TypeScript, Express, PostgreSQL, and real digital signal processing.

## Features

- 🎵 **Audio Fingerprinting**: Real implementation of the Shazam algorithm using FFT and constellation mapping
- 🔍 **Song Identification**: Identify songs from 5-10 second audio clips with high accuracy
- 📊 **Multiple Audio Formats**: Support for MP3, WAV, M4A, FLAC, AAC, OGG
- 🚀 **High Performance**: Sub-2 second identification with optimized database queries
- 🐳 **Docker Ready**: Complete containerization with PostgreSQL
- 📝 **TypeScript**: Full type safety throughout the application
- 🏗️ **Production Ready**: Proper logging, error handling, and monitoring

## Technical Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Prisma ORM
- **Audio Processing**: FFmpeg with custom DSP algorithms
- **File Handling**: Multer for multipart uploads
- **Containerization**: Docker + docker-compose

## Audio Fingerprinting Algorithm

The system implements the core Shazam algorithm:

1. **Spectrogram Generation**: Convert audio to frequency-time representation using FFT
2. **Peak Detection**: Find prominent frequency peaks using constellation map approach
3. **Anchor-Target Fingerprints**: Create hashes from frequency pairs and time differences
4. **Temporal Alignment**: Match query fingerprints and align them temporally
5. **Confidence Scoring**: Rate match quality based on aligned fingerprint count

### Audio Processing Details

- Sample rate: 22,050 Hz
- Window size: 4096 samples
- Hop length: 1024 samples
- Generates 5,000-10,000 fingerprints per 3-minute song

## API Endpoints

### Add Song
```http
POST /api/add_song
Content-Type: multipart/form-data

- audio: Audio file (MP3, WAV, M4A, FLAC, etc.)
- title: Song title
- artist: Artist name
- album: Album name (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "songId": 123,
    "fingerprintsGenerated": 8542,
    "processingTime": 12500
  }
}
```

### Identify Song
```http
POST /api/identify
Content-Type: multipart/form-data

- audio: Audio clip to identify
```

**Response:**
```json
{
  "success": true,
  "data": {
    "song": {
      "id": 123,
      "title": "Shape of You",
      "artist": "Ed Sheeran",
      "album": "÷ (Divide)",
      "duration": 233.7
    },
    "confidence": 0.85,
    "alignedMatches": 127,
    "totalQueryFingerprints": 150,
    "processingTime": 1240
  }
}
```

### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSongs": 1247,
    "totalFingerprints": 10458392,
    "successfulIdentifications": 8934,
    "averageProcessingTime": 1.2,
    "uptime": 86400000
  }
}
```

### Health Check
```http
GET /api/health
```

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- FFmpeg
- pnpm (recommended) or npm

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

The API will be available at `http://localhost:3000`

### Manual Installation

1. **Install dependencies**
```bash
pnpm install
```

2. **Setup PostgreSQL database**
```bash
# Create database
createdb shazam_clone

# Set DATABASE_URL in .env
DATABASE_URL="postgresql://username:password@localhost:5432/shazam_clone"
```

3. **Run database migrations**
```bash
pnpm prisma:migrate
pnpm prisma:generate
```

4. **Start development server**
```bash
pnpm dev
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shazam_clone"

# Server
PORT=3000
NODE_ENV=development

# Upload settings
MAX_FILE_SIZE=50000000
UPLOAD_DIR=uploads

# Audio processing
SAMPLE_RATE=22050
WINDOW_SIZE=4096
HOP_LENGTH=1024

# Logging
LOG_LEVEL=info
```

## Database Schema

### Songs Table
- `id`: Primary key
- `title`: Song title
- `artist`: Artist name
- `album`: Album name (optional)
- `duration`: Song duration in seconds
- `filePath`: Path to audio file
- `createdAt`, `updatedAt`: Timestamps

### Fingerprints Table
- `id`: Primary key
- `songId`: Foreign key to songs
- `hashValue`: Fingerprint hash (bigint)
- `timeOffset`: Time offset in seconds
- `createdAt`: Timestamp

### Performance Indexes
- `fingerprints(hashValue)`: Primary lookup index
- `fingerprints(songId, timeOffset)`: Temporal alignment
- `songs(artist, title)`: Metadata search

## Usage Examples

### Adding a Song

```bash
curl -X POST http://localhost:3000/api/add_song \
  -F "audio=@song.mp3" \
  -F "title=Shape of You" \
  -F "artist=Ed Sheeran" \
  -F "album=÷ (Divide)"
```

### Identifying a Song

```bash
curl -X POST http://localhost:3000/api/identify \
  -F "audio=@unknown_clip.mp3"
```

### Using with JavaScript/Node.js

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Add song
const addSong = async () => {
  const form = new FormData();
  form.append('audio', fs.createReadStream('song.mp3'));
  form.append('title', 'Shape of You');
  form.append('artist', 'Ed Sheeran');
  
  const response = await axios.post('http://localhost:3000/api/add_song', form, {
    headers: form.getHeaders()
  });
  
  console.log(response.data);
};

// Identify song
const identifySong = async () => {
  const form = new FormData();
  form.append('audio', fs.createReadStream('clip.mp3'));
  
  const response = await axios.post('http://localhost:3000/api/identify', form, {
    headers: form.getHeaders()
  });
  
  console.log(response.data);
};
```

## Performance Targets

- **Fingerprint Generation**: < 30 seconds per song
- **Song Identification**: < 2 seconds per query
- **Database Size**: ~1MB per 100 songs
- **Memory Usage**: < 500MB for application
- **Accuracy**: 85-95% for clear audio, 60-80% for noisy environments

## Architecture

```
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── shazam.controller.ts
│   │   └── user.controller.ts
│   ├── services/             # Business logic
│   │   ├── audio-fingerprinter.service.ts
│   │   ├── song-matcher.service.ts
│   │   ├── database.service.ts
│   │   └── shazam.service.ts
│   ├── middleware/           # Custom middleware
│   │   └── upload.middleware.ts
│   ├── routes/               # API routes
│   │   ├── index.ts
│   │   ├── shazam.routes.ts
│   │   └── user.routes.ts
│   ├── utils/                # Utilities
│   │   ├── logger.ts
│   │   └── prisma.ts
│   └── index.ts              # App entry point
├── prisma/                   # Database schema
│   └── schema.prisma
├── uploads/                  # Uploaded audio files
├── docker-compose.yml        # Docker services
├── Dockerfile               # App container
└── package.json             # Dependencies
```

## Development

### Available Scripts

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build TypeScript to JavaScript
pnpm start        # Start production server
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:studio    # Open Prisma Studio
pnpm test         # Run tests
```

### Adding New Audio Formats

To support additional audio formats, update the `fileFilter` in `upload.middleware.ts`:

```typescript
const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.webm'];
const allowedMimeTypes = ['audio/mpeg', 'audio/wav', /* ... */];
```

## Troubleshooting

### FFmpeg Issues
If you encounter FFmpeg errors:
- Ensure FFmpeg is installed: `ffmpeg -version`
- On Ubuntu: `sudo apt install ffmpeg`
- On macOS: `brew install ffmpeg`
- On Windows: Download from https://ffmpeg.org/

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists: `createdb shazam_clone`

### Memory Issues
For large files or high concurrency:
- Increase Node.js memory: `node --max-old-space-size=4096`
- Adjust batch sizes in database operations
- Consider using streaming for large files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by the original Shazam algorithm by Avery Wang
- Uses FFT implementations for digital signal processing
- Built with modern TypeScript and Node.js ecosystem
