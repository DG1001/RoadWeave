# Usage Guide

Complete guide for admins and travelers using RoadWeave.

## Admin Workflow

### 1. Login to Admin Dashboard

1. Navigate to `http://localhost:3000/admin` (or your domain)
2. Enter admin credentials:
   - **Username**: `admin` (or custom from `.env`)
   - **Password**: Displayed in backend console on startup
3. Click "Login"

### 2. Create a Trip

1. In the "Create New Trip" section:
   - **Trip Name**: Enter descriptive name (e.g., "European Adventure")
   - **Description**: Brief overview of the trip
   - **Blog Language**: Select from 19 available languages
2. Click "Create Trip"

### 3. Add Travelers

1. Select the created trip from the "Existing Trips" list
2. In the "Manage Trip" section:
   - **Traveler Name**: Enter traveler's name
   - Click "Add Traveler"
3. **Share the generated token link** with the traveler:
   - Copy the link from the traveler card
   - Send via email, SMS, or messaging app
   - Example: `http://localhost:3000/traveler/abc123def456...`

### 4. Manage Blog Content

**View Blog:**
- Click "View Blog" button to see the admin version
- Contains full content with AI-generated narratives

**Public Access:**
- Toggle "🔒 Private" to "🌐 Public" to enable public access
- Share the public link for read-only access
- Click "View Public Blog" to see the public version

**Reactions Control:**
- Toggle "👍 Reactions On" to "🚫 Reactions Off" to control public engagement
- When enabled: Public viewers can react to blog posts with 6 LinkedIn-style emotions
- When disabled: Clean, content-focused view without reaction buttons
- Setting applies immediately to public view

**Regenerate Blog:**
- Click "Regenerate Blog" to rebuild content from all entries
- Useful after changing language or when content needs refresh

**Update Language:**
- Change language dropdown and click to update
- Consider regenerating blog after language changes

### 5. Monitor Activity

- **Trip Statistics**: View traveler count and entry count
- **All Entries**: Expand to see chronological list of submissions
- **Traveler Management**: Copy and reshare links as needed

### 6. Coordinate Editing (Admin)

Admins can edit entry coordinates for better accuracy:

1. **View Blog**: Click "View Blog" to access admin blog view
2. **Locate Entry**: Find entry with incorrect coordinates in the entries list
3. **Edit Coordinates**: Click the "✏️ Edit" button next to coordinates
4. **Interactive Map**: Mini map opens showing current location
5. **Adjust Location**: 
   - Click anywhere on map to set new coordinates
   - Drag the red marker for precise positioning
   - Use manual coordinate input if needed
6. **Save Changes**: Click "Save Coordinates" to update
7. **Verify**: Coordinates update in entries list and main map

**Calendar View:**
- Calendar shows days with entries (📝 text, 📷 photo, 🎵 audio counts)
- Click any day to filter entries for that specific date
- Navigate months with arrow buttons
- "Today" button returns to current month
- Week starts on Monday for better European compatibility

## Traveler Workflow

### 1. Access Traveler Link

1. Use the unique token link provided by admin
2. Example: `http://localhost:3000/traveler/abc123def456...`
3. Bookmark for easy access during the trip

### 2. Allow Location Access

1. Browser will prompt for location permissions
2. Click "Allow" for automatic GPS capture
3. Required for map integration and location-based features

### 3. Share Experiences

#### Entry Types

**📝 Text Entry:**
1. Select "Text" option
2. Enter your thoughts in the text area
3. Describe what you're experiencing, feeling, or observing
4. Click "Share Entry"

**📷 Photo Entry:**
1. Select "Photo" option
2. Click "Choose File" or use camera (mobile)
3. **Add optional comment** describing:
   - What's in the photo
   - Where it was taken
   - How you're feeling
   - Context or story behind the image
4. **Location**: Uses current device GPS or manual map selection
5. Click "Share Entry"

*Note: Photo GPS extraction has been removed. All entries now use device location or manual selection for consistent, reliable positioning.*

**🎤 Voice Entry:**
1. Select "Voice" option
2. Click "🎤 Start Recording"
3. Speak naturally about your experience
4. Click "⏹ Stop Recording" when finished
5. Play back to verify (optional)
6. Click "Share Entry"

#### Tips for Great Entries

**Text Entries:**
- Be descriptive and personal
- Include emotions and reactions
- Mention specific details (food, people, architecture)
- Share funny or memorable moments

**Photo Entries:**
- Add meaningful comments - they enhance AI analysis
- Describe what's not obvious in the image
- Include context about the moment
- Mention people or stories connected to the photo

**Voice Entries:**
- Speak clearly and naturally
- Share immediate thoughts and emotions
- Describe surroundings and atmosphere
- Voice messages are transcribed and integrated into the blog

### 4. Location Selection

RoadWeave offers two ways to set location for your entries:

#### Automatic GPS (Default)
- **GPS Capture**: Automatic when permission granted
- **Location Status**: Green checkmark indicates successful capture
- **Retry**: Click "Try Again" if location fails
- **Accuracy**: Uses device's current location

#### Manual Location Picker (New!)
1. Click "🗺️ Pick from Map" button in location section
2. Interactive map opens with your current position (if available)
3. **Click anywhere** on the map to select that location
4. **Drag the green marker** to fine-tune position
5. View exact coordinates at bottom of map
6. Click "Use This Location" to confirm
7. Click "Cancel" to return to GPS mode

**Use Cases for Manual Location:**
- GPS is inaccurate or unavailable
- Want to mark a specific landmark or attraction
- Posting about a location you visited earlier
- More precise location control needed
- Indoor locations where GPS doesn't work well

**Location Display:**
- **Current GPS**: Shows "📱 Use Current GPS" with current coordinates
- **Manual Selection**: Shows "🗺️ Pick from Map" with selected coordinates
- Easy switching between modes at any time


## Blog Viewing Experience

### AI-Generated Blog

**Travel Story Section:**
- AI-generated narrative in selected language
- Inline photos with contextual placement
- Rich descriptions combining user comments and AI analysis
- Professional travel blog writing style
- **Location Mini-Maps**: Click 📍 icons next to timestamps to view entry locations:
  - Shows exact coordinates where each entry was created
  - Interactive read-only map with entry details
  - Works for both photo captions and content piece timestamps
  - Automatically appears only when location data exists

**Interactive Map:**
- Shows all entries with GPS coordinates
- Color-coded markers by entry type:
  - 🔵 Blue: Text entries
  - 🟢 Green: Photo entries  
  - 🔴 Red: Voice entries
- Click markers for popup details
- **Click-to-Jump Navigation**: Click content in map popups to jump directly to that entry in the blog:
  - **Photos**: Click mini-images to jump to full photo in story
  - **Text**: Click text snippets (with blue borders) to jump to content
  - **Audio**: Click "🎵 Jump to story" buttons to navigate to audio entries
- **Smart Navigation**: Automatically clears date filters when needed to show target content
- Automatic map centering on first entry

**Expandable Details:**
- "All Entries" section shows chronological list
- Click "▶ Show Details" to expand
- View raw entries with timestamps
- See traveler names and locations

### Public Reactions System

**Interactive Engagement:**
- **LinkedIn-Style Reactions**: Choose from 6 emotional responses:
  - 👍 **Like** - General approval and enjoyment
  - 👏 **Applause** - Appreciation for achievements or impressive moments  
  - 💪 **Support** - Encouragement and solidarity
  - ❤️ **Love** - Deep emotional connection or beauty
  - 💡 **Insightful** - Educational or thought-provoking content
  - 😂 **Funny** - Humor and entertainment

**How It Works:**
- Click any reaction button to react to a blog post
- One reaction per post - click the same reaction again to remove it
- Switch reactions by clicking a different one
- See total counts from all public viewers
- Your choice is remembered in your browser (no account needed)

**Privacy Features:**
- No personal data stored on servers
- Reactions tracked locally in browser localStorage  
- Only aggregated counts are saved and displayed
- Completely anonymous engagement system

### Entry Processing

**Text Entries:**
- Appear directly in blog narrative
- Enhanced by AI for better flow and storytelling

**Photo Entries:**
- AI analyzes visual content for descriptions
- User comments combined with AI insights
- Photos placed contextually via `[PHOTO:id]` markers
- Automatic fallback for photos without AI analysis

**Voice Entries:**
- Audio transcribed to text using AI
- Transcriptions integrated into blog narrative
- Original audio files accessible in detailed view
- Natural speech converted to written storytelling

## Advanced Features

### Multi-language Support

**Available Languages:**
English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Dutch, Swedish, Norwegian, Danish, Finnish, Polish, Turkish

**Changing Language:**
1. Admin selects new language in trip settings
2. Click to update language setting
3. Click "Regenerate Blog" for existing content
4. New entries automatically use new language

### Public vs Private Access

**Private Mode (Default):**
- Only admin can view blog content
- Travelers can only submit entries
- Secure admin-only access

**Public Mode:**
- Generates unique public token
- Read-only access for anyone with link
- Admin retains full control
- Toggle on/off anytime

### AI Cost Management

**Photo Analysis:**
- ~$0.0002 per photo analyzed
- Daily limits configurable
- Cost logging available
- Automatic image resizing for optimization

**Audio Transcription:**
- Cost based on audio file size
- Configurable feature (can be disabled)
- Cost tracking and logging
- Multiple audio format support

## Best Practices

### For Admins

1. **Setup**: Configure AI features before trip starts
2. **Communication**: Clearly explain token links to travelers
3. **Monitoring**: Regularly check entries and blog generation
4. **Language**: Set language before trip begins
5. **Backup**: Export/backup important trips

### For Travelers

1. **Location**: Always allow GPS access for best experience
2. **Comments**: Add descriptive comments to photos
3. **Voice**: Speak clearly for better transcription
4. **Timing**: Submit entries promptly while experiences are fresh
5. **Variety**: Mix text, photos, and voice for rich content

### Content Guidelines

**Great Entries Include:**
- Specific details and emotions
- Personal reactions and thoughts
- Context about locations and experiences
- Stories and memorable moments
- Descriptive language for places and people

**Avoid:**
- Generic phrases ("nice view")
- Technical photo details only
- Extremely short entries
- Unclear or mumbled voice recordings
- Inappropriate or offensive content

## Troubleshooting

**Common Issues:**

1. **Location not working**: Check browser permissions
2. **Upload failures**: Verify internet connection
3. **Audio not recording**: Check microphone permissions
4. **Photos not appearing**: Ensure AI analysis is enabled
5. **Blog not updating**: Try regenerating blog content

For detailed troubleshooting, see [Troubleshooting Guide](troubleshooting.md).

## Next Steps

- [AI Features](ai-features.md) - Learn about photo analysis and audio transcription
- [API Reference](api.md) - Integrate with RoadWeave programmatically
- [Deployment Guide](deployment.md) - Set up production deployment