# AI Features Guide

Comprehensive guide to RoadWeave's AI-powered features using Google Gemini.

## Overview

RoadWeave leverages Google Gemini 2.0 Flash for:
- **📸 Photo Analysis**: Rich visual descriptions for travel images
- **🎤 Audio Transcription**: Speech-to-text for voice messages
- **✍️ Blog Generation**: Intelligent travel narratives

## Photo Analysis

### What It Does

The AI photo analysis feature:
- Analyzes uploaded photos using Gemini Vision
- Generates detailed, travel-blog-style descriptions
- Combines visual analysis with user comments
- Integrates photos contextually in blog content
- Supports multi-language descriptions

### Sample Analysis

**User uploads mountain photo with comment**: "Amazing sunrise at the summit!"

**AI generates**: 
> The image captures a breathtaking alpine sunrise with golden light illuminating snow-capped peaks stretching endlessly into the distance. The dramatic interplay of shadows and light creates a majestic panorama that perfectly complements the user's sense of awe at reaching the summit during this magical morning moment.

### Configuration

```env
# Enable photo analysis
ENABLE_PHOTO_ANALYSIS=true

# Cost and performance settings
MAX_IMAGE_SIZE=1024
PHOTO_ANALYSIS_LOG_COSTS=true
DAILY_PHOTO_ANALYSIS_LIMIT=100
```

### Cost Analysis

**Gemini 2.0 Flash Pricing:**
- **Input**: $0.10 per 1M tokens
- **Output**: $0.40 per 1M tokens

**Per Photo Costs:**
- 1024×1024 image ≈ 1,290 tokens ≈ $0.00013
- Description ≈ 200 tokens ≈ $0.00008
- **Total: ~$0.0002 per photo**

**Usage Examples:**
| Photos/Day | Daily Cost | Monthly Cost | Annual Cost |
|------------|------------|--------------|-------------|
| 10 | $0.002 | $0.06 | $0.73 |
| 50 | $0.01 | $0.30 | $3.65 |
| 100 | $0.02 | $0.60 | $7.30 |
| 500 | $0.10 | $3.00 | $36.50 |

### Cost Controls

**Image Optimization:**
```env
MAX_IMAGE_SIZE=1024  # Reduces to max 1024x1024px
```

**Daily Limits:**
```env
DAILY_PHOTO_ANALYSIS_LIMIT=100  # Max 100 photos/day
# Set to 0 for unlimited
```

**Cost Logging:**
```env
PHOTO_ANALYSIS_LOG_COSTS=true
```
Shows real-time cost estimates in server logs:
```
💰 Photo Analysis Cost Estimate:
   Original size: 3024x4032 (resized)
   Final size: 768x1024
   Estimated tokens: 1290
   Estimated input cost: $0.000129
   Estimated output cost: $0.000052
   Total estimated cost: $0.000181
```

### How It Works

1. **Image Upload**: Traveler uploads photo with optional comment
2. **Analysis Check**: System checks if analysis is enabled and within limits
3. **Image Processing**: Resizes image for cost optimization
4. **AI Analysis**: Gemini Vision analyzes visual content
5. **Content Integration**: AI description combined with user comment
6. **Blog Placement**: Photo placed contextually in blog via `[PHOTO:id]` markers

### Analysis Prompt

The AI receives this optimized prompt:

```
Analyze this travel photo and provide a detailed description for a travel blog.

User's comment about the photo: "[user comment]"

Please describe:
1. What you see in the image (objects, people, scenery, architecture, etc.)
2. The setting/location type (urban, nature, indoor, outdoor, etc.)
3. The mood or atmosphere of the scene
4. Any interesting details or notable features
5. How this relates to the user's comment if provided

Write 2-3 sentences in an engaging, descriptive travel blog style.
Focus on creating vivid imagery that helps readers visualize the scene.
```

## Audio Transcription

### What It Does

The audio transcription feature:
- Converts voice messages to text using Gemini
- Integrates transcriptions into blog narratives
- Preserves natural speech patterns and emotions
- Supports multiple audio formats
- Works in any of the 19 supported languages

### Sample Transcription

**User records**: *"Oh my god, this gelato is incredible! We found this tiny family shop in Florence and the pistachio flavor is unlike anything I've ever tasted. The owner told us they've been making it the same way for three generations."*

**AI transcribes and blog integrates**: 
> The authentic flavors of Florence came alive as our traveler discovered a hidden gem - a family gelato shop serving pistachio gelato made with three generations of traditional craftsmanship, creating an unforgettable taste experience.

### Configuration

```env
# Enable audio transcription
ENABLE_AUDIO_TRANSCRIPTION=true

# Cost tracking
AUDIO_TRANSCRIPTION_LOG_COSTS=true
```

### Supported Formats

- **WebM** (primary browser format)
- **MP3** (universal compatibility)
- **WAV** (high quality)
- **OGG** (open source)
- **M4A** (Apple devices)
- **AAC** (compressed audio)

### Cost Analysis

**Pricing Model:**
- Based on audio file size
- Roughly $0.001 per MB of audio
- Variable output costs based on transcription length

**Typical Costs:**
| Audio Length | File Size | Estimated Cost |
|--------------|-----------|----------------|
| 30 seconds | ~0.5 MB | $0.0005 |
| 1 minute | ~1 MB | $0.001 |
| 5 minutes | ~5 MB | $0.005 |

### Transcription Prompt

```
Please transcribe this audio recording accurately.

Instructions:
1. Convert the speech to text exactly as spoken
2. Use proper punctuation and capitalization
3. If there are unclear parts, mark them as [unclear]
4. If multiple speakers, indicate when speaker changes
5. Keep the natural flow and tone of the speech
6. If the audio contains travel experiences, preserve the enthusiasm and details

Provide only the transcription, no additional commentary.
```

## Blog Generation

### Intelligent Narrative Creation

The AI blog generation:
- Creates cohesive travel narratives from individual entries
- Maintains consistent tone and style
- Incorporates visual and audio analysis
- Adapts to selected language
- Builds progressive storytelling

### Content Enhancement Process

1. **Entry Analysis**: Each new entry is analyzed for content and context
2. **Context Building**: AI considers existing blog content and trip information
3. **Language Adaptation**: Content generated in selected blog language
4. **Style Consistency**: Maintains travel blog tone throughout
5. **Media Integration**: Seamlessly incorporates photos and transcriptions

### Generation Prompt Structure

```
You are helping to incrementally update a travel blog for a trip called "[trip name]".

IMPORTANT: Write your response in [language] language.

Current blog content: [existing content]

New entry details:
- Entry ID: [id]
- Type: [text/photo/audio]
- Content: [enhanced description with AI analysis]
- Location: [GPS coordinates or "No location data"]
- Traveler: [name]
- Time: [timestamp]

Please add a short, engaging paragraph (2-3 sentences) about this new entry to the blog.
Consider the location if GPS is available, and comment meaningfully on the content.
Write in a friendly, travel blog style in [language].
```

## Configuration Best Practices

### Development Setup

```env
# Enable all features for testing
ENABLE_PHOTO_ANALYSIS=true
ENABLE_AUDIO_TRANSCRIPTION=true

# Conservative limits for testing
MAX_IMAGE_SIZE=1024
DAILY_PHOTO_ANALYSIS_LIMIT=50

# Enable cost logging
PHOTO_ANALYSIS_LOG_COSTS=true
AUDIO_TRANSCRIPTION_LOG_COSTS=true
```

### Production Setup

```env
# Production AI features
ENABLE_PHOTO_ANALYSIS=true
ENABLE_AUDIO_TRANSCRIPTION=true

# Optimized settings
MAX_IMAGE_SIZE=1024
DAILY_PHOTO_ANALYSIS_LIMIT=200

# Cost monitoring
PHOTO_ANALYSIS_LOG_COSTS=true
AUDIO_TRANSCRIPTION_LOG_COSTS=true
```

### Cost-Conscious Setup

```env
# Minimal AI features
ENABLE_PHOTO_ANALYSIS=false
ENABLE_AUDIO_TRANSCRIPTION=false

# Or with strict limits
ENABLE_PHOTO_ANALYSIS=true
DAILY_PHOTO_ANALYSIS_LIMIT=20
MAX_IMAGE_SIZE=512
```

## Monitoring and Optimization

### Server Logs

**Startup Information:**
```
🚀 Starting RoadWeave backend server...
   📸 Photo Analysis: ✅ Enabled
      Daily limit: 100 photos
      Max image size: 1024×1024px
      Cost logging: ✅ Enabled
   🎤 Audio Transcription: ✅ Enabled
      Cost logging: ✅ Enabled
```

**Runtime Logging:**
```
📸 Analyzing image: photo_abc123.jpg
💰 Photo Analysis Cost Estimate:
   Total estimated cost: $0.000181
🤖 Photo analysis result: A stunning sunset over the Mediterranean...

🎤 Transcribing audio: voice_def456.webm
🤖 Audio transcription result: This market is absolutely incredible...
```

### Performance Optimization

**Image Processing:**
- Automatic resizing reduces token costs
- Maintains visual quality while optimizing performance
- Original files preserved for full-resolution viewing

**Daily Limits:**
- Prevents runaway costs
- Graceful fallback to user comments
- Automatic reset at midnight

**Error Handling:**
- Continues functioning if AI features fail
- Falls back to user-provided content
- Logs errors for debugging

## Troubleshooting AI Features

### Photo Analysis Issues

**Problem**: Photos not being analyzed
**Solutions**:
1. Check `ENABLE_PHOTO_ANALYSIS=true`
2. Verify Gemini API key is valid
3. Check daily limit not exceeded
4. Ensure image file format is supported

**Problem**: Poor analysis quality
**Solutions**:
1. Encourage users to add descriptive comments
2. Check image quality and lighting
3. Verify image isn't corrupted or extremely small

### Audio Transcription Issues

**Problem**: Audio not being transcribed
**Solutions**:
1. Check `ENABLE_AUDIO_TRANSCRIPTION=true`
2. Verify audio format is supported
3. Check file isn't corrupted
4. Ensure audio has clear speech

**Problem**: Poor transcription quality
**Solutions**:
1. Advise users to speak clearly
2. Reduce background noise
3. Check microphone quality
4. Keep recordings under 5 minutes

### API Issues

**Problem**: API rate limiting
**Solutions**:
1. Implement exponential backoff
2. Reduce daily limits
3. Monitor API usage
4. Consider upgrading API plan

## Next Steps

- [Setup Guide](setup.md) - Configure AI features
- [Usage Guide](usage.md) - Best practices for content creation
- [Troubleshooting](troubleshooting.md) - Solve common issues
- [API Reference](api.md) - Technical implementation details