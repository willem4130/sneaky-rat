# Component Mode Output Example

When you copy a hero section in **Component Mode**, the extension would generate:

## 1. Design Tokens (`design-tokens.ts`)

```typescript
export const designTokens = {
  colors: {
    primary: 'oklch(0.141 0.005 285.823)',
    'text-primary': 'rgb(24, 24, 27)',
    'text-secondary': 'oklch(0.552 0.016 285.938)',
    'bg-gradient-1': 'rgb(251, 146, 60)',
    'bg-gradient-2': 'rgb(244, 114, 182)',
    'bg-gradient-3': 'rgb(232, 121, 249)',
  },

  spacing: {
    '2': '8px',
    '4': '16px',
    '6': '24px',
    '12': '48px',
    '16': '64px',
  },

  fontSize: {
    'sm': '14px',
    'base': '16px',
    'xl': '20px',
    '7xl': '70.4px',
  },

  fontWeight: {
    'medium': '500',
  },

  borderRadius: {
    'md': '8px',
    'xl': '24px',
    'full': '9999px',
  },
}
```

## 2. Tailwind Config (`tailwind.config.js`)

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: 'oklch(0.141 0.005 285.823)',
        'text-primary': 'rgb(24, 24, 27)',
        'text-secondary': 'oklch(0.552 0.016 285.938)',
      },
      spacing: {
        '18': '72px',
        '147': '588px',
      },
      fontSize: {
        '7xl': '70.4px',
      },
    },
  },
}
```

## 3. Component File (`HeroSection.tsx`)

```typescript
import React from 'react'

export interface HeroSectionProps {
  title?: string
  description?: string
  ctaText?: string
  ctaHref?: string
  videoSrc?: string
}

export function HeroSection({
  title = "AI agents for magical customer experiences",
  description = "Chatbase is the complete platform for building & deploying AI support agents for your business.",
  ctaText = "Build your agent",
  ctaHref = "#",
  videoSrc
}: HeroSectionProps) {
  return (
    <div className="container relative mx-auto grid items-center gap-6 px-4 lg:grid-cols-2">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        <h1 className="text-7xl font-medium tracking-tight leading-[80px]">
          {title}
        </h1>

        <p className="text-xl text-text-secondary">
          {description}
        </p>

        <div className="mt-2 flex flex-row items-center gap-4">
          <a href={ctaHref} className="contents">
            <div className="relative inline-block">
              {/* Button gradient underline */}
              <div className="absolute bottom-2 h-4 w-full translate-y-full rounded-b-lg bg-gradient-to-r from-bg-gradient-1 via-bg-gradient-2 to-bg-gradient-3" />

              <button className="px-6 py-2 h-14 bg-primary text-white rounded-md font-medium flex items-center justify-center gap-2 transition-all duration-200">
                {ctaText}
              </button>
            </div>
          </a>

          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <CreditCardIcon className="h-4 w-4" />
            No credit card required
          </div>
        </div>
      </div>

      {/* Right Column - Video */}
      <div className="relative aspect-[0.939] w-full overflow-hidden rounded-3xl">
        <video
          className="w-full h-full"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 16 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      {/* SVG paths */}
    </svg>
  )
}
```

## 4. Usage Example

```typescript
import { HeroSection } from '@/components/HeroSection'

export default function HomePage() {
  return (
    <main>
      <HeroSection
        title="Your Custom Title"
        description="Your custom description"
        ctaText="Get Started"
        ctaHref="/signup"
        videoSrc="/hero-video.webm"
      />
    </main>
  )
}
```

---

## Benefits of Component Mode:

1. ✅ **Reusable** - Props make it easy to customize
2. ✅ **Maintainable** - Design tokens in one place
3. ✅ **Type-safe** - TypeScript interfaces
4. ✅ **Consistent** - Uses Tailwind utilities
5. ✅ **Scalable** - Easy to extend and modify
6. ✅ **Clean** - No inline styles, semantic class names

This is what you'd want when building an actual Next.js app from copied components!
