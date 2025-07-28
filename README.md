# PicPocket Web Application

A modern React + TypeScript + Vite application for sharing and organizing photos with friends and family.

## Features

### Photo Management

- Upload and organize photos in events
- Create and manage photo pockets
- Add friends and family as members
- View photos in grid and detail views

### Comments System

- **Text Comments**: Add text-based comments to photos
- **Voice Notes**: Record and share voice notes as comments
  - Click the microphone button (🎤) to start recording
  - Voice notes are uploaded to S3 and associated with photos
  - Voice notes cannot be edited, only deleted
  - Supports audio/webm format for optimal quality

### Voice Note Features

- Real-time recording with visual feedback
- Automatic upload to S3 after recording
- Audio playback with progress bar and seek functionality
- Microphone access with proper error handling
- Recording time display and controls

## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS with CSS Variables for theming
- **State Management**: React Query for server state
- **Audio**: Web Audio API with MediaRecorder
- **File Upload**: Direct S3 upload with presigned URLs

## Voice Note Implementation

The voice note functionality includes:

1. **VoiceNoteRecorder Component**: Handles microphone access and recording
2. **VoiceNotePlayer Component**: Provides audio playback with controls
3. **Updated CommentsSection**: Integrates voice notes with existing comment system
4. **API Integration**: Supports both text and voice note comments

### Voice Note Flow

1. User clicks microphone button
2. Browser requests microphone access
3. User records voice note
4. Audio is uploaded to S3 via presigned URL
5. Object key is sent to backend to create comment
6. Voice note appears in comments with playback controls

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## API Endpoints

The application supports the following comment endpoints:

- `POST /v1/photo/{photo-id}` - Add text or voice note comment
- `PATCH /v1/comment/{comment-id}` - Edit text comment (voice notes cannot be edited)
- `DELETE /v1/comment/{comment-id}` - Delete comment

Voice notes are uploaded using the existing media upload infrastructure and associated with photos via object keys.

## Browser Compatibility

Voice notes require:

- HTTPS (for microphone access)
- Modern browser with MediaRecorder API support
- User permission for microphone access

Supported browsers: Chrome, Firefox, Safari, Edge (latest versions)
