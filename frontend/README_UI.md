# Grameen AI Sahayak - Rural Assistant UI

A beautiful, mobile-first web application UI for a voice-first AI assistant designed for rural users in India with low digital literacy.

## 🎯 Project Overview

**Grameen AI Sahayak** is a production-ready, highly polished UI built with **Next.js (App Router)** and **Tailwind CSS**. The app focuses on simplicity, accessibility, and an intuitive user experience for first-time smartphone users in rural India.

### Key Features

- ✅ **Mobile-First Design** - Optimized for smartphones and responsive for desktop
- ✅ **Voice-First Interaction** - Emphasis on voice input with large, touch-friendly buttons
- ✅ **Hindi UI** - All text in Hindi for rural users
- ✅ **Beautiful Animations** - Smooth transitions and micro-interactions
- ✅ **Offline Support** - Offline FAQs and local information
- ✅ **Accessible** - Large buttons, readable fonts, high contrast
- ✅ **Rural-Inspired Design** - Colors inspired by rural India (green, cream, yellow)

## 📁 Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── landing/page.tsx         # Landing/Welcome screen
│   ├── user-selection/page.tsx  # User role selection (किसान, छात्र, मजदूर)
│   ├── page.tsx                 # Home Dashboard (main app)
│   ├── chat/page.tsx            # Chat interface
│   ├── voice-listening/page.tsx # Voice listening state
│   ├── offline/page.tsx         # Offline mode with FAQs
│   ├── profile/page.tsx         # User profile settings
│   ├── response/page.tsx        # Response continuation screen
│   ├── layout.tsx               # Root layout with context provider
│   └── globals.css              # Global styles

├── components/                   # Reusable React components
│   ├── Button.tsx               # Button (4 variants: primary, secondary, ghost, outline)
│   ├── Card.tsx                 # Card component with hover effects
│   ├── MicButton.tsx            # Large microphone button with pulse animation
│   ├── ChatBubble.tsx           # Chat message bubble
│   ├── SelectionCard.tsx        # Selection card for user roles
│   ├── WaveformAnimation.tsx    # Animated waveform for voice listening
│   └── Badge.tsx                # Status badge for notifications

├── lib/
│   ├── AppContext.tsx           # React Context for app state (user role, online status)
│   └── (existing api files)

├── tailwind.config.ts           # Tailwind configuration with rural color palette
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript configuration
```

## 🎨 Design System

### Color Palette (Rural India Inspired)

```
rural-cream:        #fef9f3  (soft cream base)
rural-green:        #4ade80  (bright green)
rural-greenDark:    #22c55e  (deep green for accent)
rural-greenLight:   #dcfce7  (light green highlights)
rural-yellow:       #fef08a  (soft yellow accent)
rural-white:        #ffffff  (pure white for cards)
```

### Typography

- **Font**: Noto Sans Devanagari + system fallbacks
- **Large, readable text** for accessibility
- **Clear hierarchy** of sizes (H1: 3xl, H2: 2xl, Body: sm-md)

### Components

1. **Button** - 4 variants with smooth transitions and active states
   - Primary: Green background
   - Secondary: Light green background
   - Ghost: Transparent with hover effect
   - Outline: Bordered style

2. **Card** - Soft shadows, rounded corners, optional hover animation

3. **MicButton** - Special 24x24px button with:
   - Pulsing glow effect
   - Animated internal waveform
   - Status indicator below

4. **ChatBubble** - Message bubbles with speaker button for TTS

5. **SelectionCard** - Large tappable cards for role selection

### Animations

- `pulse-glow` - Pulsing opacity for microphone
- `fade-in` - Message appearance
- `slide-up` - Content entrance
- `bounce-subtle` - Gentle bouncing effect

## 📱 Screens Overview

### 1. Landing Page (`/landing`)

- App name and greeting (नमस्ते 🙏)
- Subtitle: "आपकी मदद के लिए तैयार"
- Large "शुरू करें" (Start) button
- Feature preview (Voice, Fast, Offline)

### 2. User Selection (`/user-selection`)

- Question: "आप कौन हैं?" (Who are you?)
- 3 large selectable cards:
  - 🌾 किसान (Farmer)
  - 🎓 छात्र (Student)
  - 👷 मजदूर (Worker)

### 3. Home Dashboard (`/`)

- Time-based greeting (सुप्रभात, नमस्कार, शुभ संध्या)
- Large microphone button with pulsing effect
- 3 action cards:
  - 🌾 खेती सलाह (Farm Advice)
  - 🏥 स्वास्थ्य (Health)
  - 🏛️ सरकारी योजना (Government Schemes)
- Suggestion buttons for quick access
- Online/offline status badge
- Profile button (👤)

### 4. Voice Listening (`/voice-listening`)

- Large animated microphone icon
- Waveform animation
- Text: "सुन रहे हैं... बोलिए..." (Listening... Speak...)
- Countdown timer
- Cancel button

### 5. Chat Interface (`/chat`)

- Clean WhatsApp-style chat
- Left: AI messages (light green background)
- Right: User messages (green background)
- Speak button (🔊 सुनें) under AI messages
- Input area with microphone button, text input, send button
- Quick suggestion buttons

### 6. Offline Mode (`/offline`)

- Warning banner: "आप ऑफलाइन हैं ⚠️"
- 2 FAQ categories:
  - 🌾 खेती के सवाल (Farm FAQs)
  - 🏥 स्वास्थ्य के सवाल (Health FAQs)
- Expandable Q&A items
- Text-to-speech button for each answer

### 7. Profile (`/profile`)

- User information (Name, Location, Land Size, Crop)
- Settings (Notifications, Language, Privacy)
- About section
- Logout button

### 8. Response (`/response`)

- Success checkmark animation (✓)
- Response display with speak button
- "क्या आप और कुछ पूछना चाहते हैं?" (Want to ask more?)
- Navigation buttons

## 🎯 App State Management

### Context (`lib/AppContext.tsx`)

```typescript
- userRole: "किसान" | "छात्र" | "मजदूर" | null
- isOnline: boolean
- hasCompletedOnboarding: boolean

// Methods to update state:
- setUserRole()
- setIsOnline()
- setHasCompletedOnboarding()
```

### Flow

1. **Landing** → User clicks "शुरू करें"
2. **User Selection** → User chooses role (किसान/छात्र/मजदूर)
3. **Home Dashboard** → Main app interface
4. **Chat/Action** → User can:
   - Use microphone for voice input
   - Click action cards for topics
   - Or type questions
5. **Offline Mode** → Auto-accessible when offline

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## 🛠️ Development

### Adding New Pages

1. Create a new directory: `app/new-page/`
2. Create `page.tsx` with your component
3. Use `useRouter()` from `next/navigation` for navigation

### Using Components

```tsx
import Button from "@/components/Button";
import Card from "@/components/Card";
import MicButton from "@/components/MicButton";

// Button examples
<Button variant="primary" size="lg">शुरू करें</Button>
<Button variant="secondary">विकल्प</Button>
<Button variant="outline">रद्द करें</Button>

// Card example
<Card hover onClick={handleClick}>
  Content here
</Card>

// Mic button example
<MicButton 
  isListening={isListening}
  isLoading={isLoading}
  onClick={handleClick}
/>
```

### Styling

All styling is done with Tailwind CSS:

```tsx
// Use custom rural colors
<div className="bg-rural-green text-rural-cream">
  // Soft shadows
  <div className="shadow-soft hover:shadow-soft-lg">
    // Animations
    <div className="animate-pulse-glow animate-bounce-subtle">
```

### Animations

Available animations in `tailwind.config.ts`:

- `animate-pulse-glow` - Pulsing effect
- `animate-fade-in` - Fade in
- `animate-slide-up` - Slide up
- `animate-bounce-subtle` - Subtle bouncing

## 📱 Mobile Optimization

- **Touch-friendly**: All buttons are at least 12x12mm (48x48px)
- **Responsive**: Grid layouts adapt from 1 to 3 columns
- **Safe area**: Uses `pb-safe` for notch/home indicator safety
- **No zoom**: Viewport set to prevent unwanted zoom on inputs
- **Tap feedback**: Disabled tap highlight for smooth interaction

## ♿ Accessibility

- Large, readable fonts (minimum 16px)
- High contrast colors (WCAG AA compliant)
- Clear button labels with aria-label
- Keyboard navigation support
- Text-to-speech support (browser native)

## 🔄 Browser Support

- Chrome/Chromium (latest)
- Safari (iOS 13+)
- Firefox (latest)
- Edge (latest)

### Browser APIs Used

- **Speech Recognition** - Voice input (webkit/standard)
- **Speech Synthesis** - Text-to-speech (browser native)
- **Geolocation** - Optional for location-based features
- **LocalStorage** - Profile persistence

## 📚 Key Technologies

- **Next.js 15.4.6** - React framework with App Router
- **React 19.1.0** - UI library
- **Tailwind CSS 3.4.17** - Utility-first CSS
- **TypeScript 5.8.3** - Type safety
- **Lucide React** - Icons (optional, using emoji for now)

## 🎁 Features Implemented

✅ Landing screen with onboarding  
✅ User role selection  
✅ Beautiful home dashboard  
✅ Voice listening animation  
✅ Chat interface with TTS  
✅ Offline mode with FAQs  
✅ User profile management  
✅ Response continuation flow  
✅ Mobile-first responsive design  
✅ Smooth animations everywhere  
✅ Hindi text throughout  
✅ Accessible UI (WCAG AA level)  
✅ Production build (zero errors)  

## 🚧 Future Enhancements

- [ ] Integrate with backend API
- [ ] Real voice recognition API
- [ ] Backend text-to-speech service
- [ ] User persistence (database)
- [ ] Analytics integration
- [ ] Push notifications
- [ ] Offline sync queue
- [ ] Multi-language support
- [ ] Accessibility improvements
- [ ] Performance optimizations

## 📄 License

This project is part of the Grameen AI initiative for rural India.

---

**Built with ❤️ for rural India** 🇮🇳
