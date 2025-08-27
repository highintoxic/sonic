# Bulk Fingerprinting Scripts

This directory contains scripts for bulk processing audio files and adding them to the Shazam clone database with their fingerprints.

## Available Scripts

### 1. `bulk-fingerprint.ts` - Main Bulk Processing Script
The core script for processing audio files and generating fingerprints.

### 2. `validate-audio-files.ts` - File Validation Script  
Validates audio filenames before processing to ensure they follow the expected format.

### 3. `process-audio-pipeline.ts` - Complete Pipeline Script
Combines validation and processing in a single workflow with user confirmations.

### 4. `example-usage.ts` - Programming Examples
Shows how to use the bulk processor programmatically in your own code.

## Filename Format

The scripts expect audio files to be named in the following format:
```
number - artist - title.extension
```

**Examples:**
- `001 - The Beatles - Hey Jude.mp3`
- `042 - Queen - Bohemian Rhapsody.wav`
- `123 - Taylor Swift - Shake It Off.flac`

## Supported Audio Formats

- MP3 (`.mp3`)
- WAV (`.wav`)
- FLAC (`.flac`)
- M4A (`.m4a`)
- OGG (`.ogg`)

## Quick Start

### Recommended Workflow (Complete Pipeline)
```bash
# Validates files first, then processes them with confirmation prompts
npm run process-audio -- ./path/to/songs

# Automated processing (no prompts)
npm run process-audio -- ./path/to/songs --auto-confirm
```

### Individual Scripts

#### Validate Files Only
```bash
npm run validate-audio -- ./path/to/songs
```

#### Bulk Fingerprint Only (Skip Validation)
```bash
npm run bulk-fingerprint -- ./path/to/songs
```

## Detailed Usage

### Method 1: Using npm script (Recommended)
```bash
# Basic usage - process all files in a directory
npm run bulk-fingerprint -- ./path/to/songs

# Start from a specific file number (useful for resuming)
npm run bulk-fingerprint -- ./path/to/songs --start-from 10

# Control concurrency (default is 2)
npm run bulk-fingerprint -- ./path/to/songs --max-concurrent 1

# Force reprocess existing songs
npm run bulk-fingerprint -- ./path/to/songs --force
```

### Method 2: Direct TypeScript execution
```bash
# Basic usage
ts-node scripts/bulk-fingerprint.ts ./path/to/songs

# With options
ts-node scripts/bulk-fingerprint.ts ./path/to/songs --start-from 5 --max-concurrent 3
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--start-from <number>` | Start processing from file number (useful for resuming interrupted processing) | 0 |
| `--max-concurrent <number>` | Maximum number of files to process simultaneously | 2 |
| `--force` | Process files even if they already exist in the database | false |

## Examples

### Basic Processing
```bash
npm run bulk-fingerprint -- ./music-collection
```

### Resume from File #25 (if previous run was interrupted)
```bash
npm run bulk-fingerprint -- ./music-collection --start-from 25
```

### Process with Lower Concurrency (to reduce system load)
```bash
npm run bulk-fingerprint -- ./music-collection --max-concurrent 1
```

### Force Reprocess All Files
```bash
npm run bulk-fingerprint -- ./music-collection --force
```

## How It Works

1. **File Discovery**: Scans the specified directory for supported audio files
2. **Filename Parsing**: Extracts artist and title from filenames using the expected format
3. **Duplicate Check**: Checks if the song already exists in the database (unless `--force` is used)
4. **Fingerprint Generation**: Uses the audio fingerprinting service to generate audio fingerprints
5. **Database Storage**: Stores the song metadata and fingerprints in the database

## Output

The script provides detailed logging:
- 🎵 File discovery progress
- 🎤 Current song being processed
- 🔍 Fingerprint generation status
- ✅ Success confirmations
- ❌ Error messages
- 📊 Progress updates and final summary

## Error Handling

The script handles various error conditions:
- Invalid filename formats
- Unsupported file types
- Audio processing errors
- Database connection issues
- File system errors

## Performance Considerations

- **Concurrency**: The script processes multiple files simultaneously (default: 2). Adjust based on your system's capabilities
- **Memory Usage**: Fingerprint generation is memory-intensive. Lower concurrency if you experience memory issues
- **Database Batching**: Fingerprints are inserted in batches of 1000 to optimize database performance
- **Resume Capability**: Use `--start-from` to resume interrupted processing sessions

## Prerequisites

Make sure you have:
1. Database connection configured (DATABASE_URL in .env)
2. Prisma schema migrated
3. FFmpeg installed (required for audio processing)
4. All dependencies installed (`pnpm install`)

## Troubleshooting

### FFmpeg Not Found
```bash
# Install FFmpeg
# Windows (using chocolatey):
choco install ffmpeg

# macOS (using homebrew):
brew install ffmpeg

# Ubuntu/Debian:
sudo apt update && sudo apt install ffmpeg
```

### Memory Issues
- Reduce `--max-concurrent` to 1
- Process files in smaller batches
- Ensure your system has sufficient RAM

### Database Connection Issues
- Check your `.env` file has correct DATABASE_URL
- Ensure database is running and accessible
- Run `npm run prisma:migrate` to ensure schema is up to date

## File Organization Tips

For best results, organize your audio files like this:
```
songs/
├── 001 - The Beatles - Hey Jude.mp3
├── 002 - Queen - Bohemian Rhapsody.mp3
├── 003 - Led Zeppelin - Stairway to Heaven.mp3
└── ...
```

This numbering system allows for:
- Easy sorting and processing order
- Simple resume functionality
- Clear progress tracking
