# Container Component

## Component Details
- Tag: div
- Dimensions: 1232x626.1953125
- Total Elements: 22
- Styles Extracted: 22
- Style Reduction: 694 → 13 (98%)

## 1. Component File (Container.tsx)

```typescript
import React from 'react'

export interface ContainerProps {
  className?: string
  children?: React.ReactNode
}

export function Container({ className, children }: ContainerProps) {
  return (
    <div className="container relative mx-auto grid items-center gap-6 px-4 lg:grid-cols-2 extracted-div-container-onah5w"><div className="flex flex-col gap-6 extracted-div-k6z2mt"><h1 className="font-medium text-[42px] text-zinc-950 leading-[2.9rem] tracking-tight lg:text-5xl lg:text-[4.4rem] lg:leading-[5rem] extracted-h1-font-medium-fs64kn">AI agents for magical customer experiences</h1><p className="text-[16px] text-muted-foreground md:text-xl lg:w-[90%] extracted-p-md-text-xl-jghi7n">Chatbase is the complete platform for building &amp; deploying AI support agents for your business.</p><div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center extracted-div-mt-2-mkcfp5"><a className="contents extracted-a-contents-build-your-agent-jtq9eq" href="/dashboard?next=create-new-chatbot"><div className="relative mb-2 inline-block extracted-div-relative-c1zwoi"><div className="absolute bottom-2 h-4 w-full translate-y-full rounded-b-lg bg-linear-to-r from-[#FB923C] via-[#F472B6] to-[#E879F9] extracted-div-absolute-uhrdtu"></div><button className="flex items-center justify-center gap-2 whitespace-nowrap font-medium outline-hidden transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 shadow-inner-sm rounded-md py-2 relative h-14 w-full px-6 text-base bg-primary text-white hover:bg-primary extracted-button-items-center-build-your-agent-zt4m8u">Build your agent</button></div></a><div className="flex items-center gap-2 self-center font-medium text-muted-foreground text-sm extracted-div-items-center-ey2eke"><svg width="24" height="24" viewBox="0 0 16 17" fill="none" stroke="none" stroke-width="1.3333333333333333" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="0" stroke-dashoffset="0" stroke-opacity="1" className="h-4 w-4 extracted-svg-k09dug"><title className="extracted-title-2oc5m1">CreditCardPlusIcon</title><path d="M14.6615 6.50521H14.6577M14.6577 6.50521H1.33185M14.6577 6.50521C14.6615 6.78028 14.6615 7.08895 14.6615 7.43854V9.50521M14.6577 6.50521C14.6455 5.60514 14.5934 5.06481 14.3708 4.6279C14.1151 4.12613 13.7072 3.71819 13.2054 3.46252C12.635 3.17188 11.8883 3.17188 10.3948 3.17188H5.59479C4.10132 3.17188 3.35458 3.17188 2.78415 3.46252C2.28238 3.71819 1.87444 4.12613 1.61877 4.6279C1.39616 5.06481 1.34405 5.60514 1.33185 6.50521M1.33185 6.50521H1.32812M1.33185 6.50521C1.32812 6.78028 1.32812 7.08895 1.32812 7.43854V9.57188C1.32812 11.0653 1.32812 11.8121 1.61877 12.3825C1.87444 12.8843 2.28238 13.2922 2.78415 13.5479C3.35458 13.8385 4.10132 13.8385 5.59479 13.8385H8.10677M5.99479 9.17188H3.99479" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" className="extracted-path-2cozb6"></path><path d="M11.2498 14.5786L12.6641 13.1644M12.6641 13.1644L14.0783 11.7502M12.6641 13.1644L11.2498 11.7502M12.6641 13.1644L14.0783 14.5786" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" className="extracted-path-a79cw5"></path></svg>No credit card required</div></div></div><div className="group relative aspect-[0.939] w-full overflow-hidden extracted-div-group-lzbpnm" style="border-radius:inherit"><video className="aspect-[0.939] w-full rounded-3xl extracted-video-aspect-0-939-b7ap15" preload="metadata" poster="https://backend.chatbase.co/storage/v1/object/public/chatbase/landing/hero/hero-thumbnail.png" playsinline="" muted="" loop="" autoplay="" style="object-fit:contain;display:block;width:100%;cursor:pointer" src="https://backend.chatbase.co/storage/v1/object/public/chatbase/landing/hero/hero.webm">Your browser does not support the video tag. Please try viewing this page in a modern browser.</video><button type="button" className="absolute bottom-4 left-4 rounded-full bg-black/25 p-2 opacity-90 transition-opacity md:p-3 group-hover:opacity-100 extracted-button-absolute-pause-video-n7do6v"><svg role="img" className="-rotate-90 absolute top-0 left-0 h-full w-full extracted-svg-rotate-90-video-progress-v7tpyy" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.8" fill="none" stroke="white" stroke-width="2.3" stroke-dasharray="94.2" stroke-dashoffset="3.9187199999999933" className="opacity-90 extracted-circle-opacity-90-s5ck6g"></circle></svg><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-pause relative h-4 w-4 md:h-6 md:w-6 extracted-svg-lucide-b2rrrl"><rect x="14" y="4" width="4" height="16" rx="1" className="extracted-rect-arjp8w"></rect><rect x="6" y="4" width="4" height="16" rx="1" className="extracted-rect-ofrkps"></rect></svg></button></div></div>
  )
}
```

## 2. Styles (styles.css or module.css)

```css
.extracted-div-container-onah5w {
  align-items: center;
  column-gap: 24px;
  display: grid;
  grid-template-columns: 588px 588px;
  grid-template-rows: 626.195px;
  height: 626.195px;
  max-width: 1400px;
  opacity: 1;
  padding-left: 16px;
  padding-right: 16px;
  position: relative;
  row-gap: 24px;
  width: 1232px;
}

.extracted-div-k6z2mt {
  column-gap: 24px;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
  flex-wrap: nowrap;
  height: 416px;
  opacity: 1;
  row-gap: 24px;
  width: 588px;
}

.extracted-h1-font-medium-fs64kn {
  display: block;
  font-size: 70.4px;
  font-weight: 500;
  height: 240px;
  letter-spacing: -1.408px;
  line-height: 80px;
  opacity: 1;
  width: 588px;
}

.extracted-p-md-text-xl-jghi7n {
  color: oklch(0.552 0.016 285.938);
  display: block;
  font-size: 20px;
  height: 56px;
  line-height: 28px;
  opacity: 1;
  width: 529.195px;
}

.extracted-div-mt-2-mkcfp5 {
  align-items: center;
  column-gap: 16px;
  display: flex;
  flex-direction: row;
  flex-shrink: 1;
  flex-wrap: nowrap;
  height: 64px;
  margin-top: 8px;
  opacity: 1;
  row-gap: 16px;
  width: 588px;
}

.extracted-a-contents-build-your-agent-jtq9eq {
  display: contents;
  opacity: 1;
}

.extracted-div-relative-c1zwoi {
  display: block;
  height: 56px;
  margin-bottom: 8px;
  opacity: 1;
  position: relative;
  width: 172.461px;
}

.extracted-div-absolute-uhrdtu {
  background-image: linear-gradient(to right in oklab, rgb(251, 146, 60) 0px, rgb(244, 114, 182) 50%, rgb(232, 121, 249) 100%);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  border-end-end-radius: 10px;
  border-end-start-radius: 10px;
  bottom: 8px;
  display: block;
  height: 16px;
  opacity: 1;
  position: absolute;
  top: 32px;
  translate: 0px 100%;
  width: 172.461px;
}

.extracted-button-items-center-build-your-agent-zt4m8u {
  padding: 8px 24px;
  border-radius: 8px;
  align-items: center;
  appearance: button;
  background-color: oklch(0.141 0.005 285.823);
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklch(0 0 0 / 0.04) 0px -1.5px 0px 0px inset;
  color: rgb(255, 255, 255);
  column-gap: 8px;
  display: flex;
  flex-direction: row;
  flex-shrink: 1;
  flex-wrap: nowrap;
  font-weight: 500;
  height: 56px;
  justify-content: center;
  opacity: 1;
  position: relative;
  row-gap: 8px;
  text-align: center;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  width: 172.461px;
}

.extracted-div-items-center-ey2eke {
  align-items: center;
  align-self: center;
  color: oklch(0.552 0.016 285.938);
  column-gap: 8px;
  display: flex;
  flex-direction: row;
  flex-shrink: 1;
  flex-wrap: nowrap;
  font-size: 14px;
  font-weight: 500;
  height: 20px;
  line-height: 20px;
  opacity: 1;
  row-gap: 8px;
  width: 178.594px;
}

.extracted-svg-k09dug {
  display: block;
  height: 16px;
  opacity: 1;
  overflow-x: hidden;
  overflow-y: hidden;
  width: 16px;
}

.extracted-title-2oc5m1 {
  display: inline;
  opacity: 1;
}

.extracted-path-2cozb6 {
  d: path("M 14.6615 6.50521 H 14.6577 M 14.6577 6.50521 H 1.33185 M 14.6577 6.50521 C 14.6615 6.78028 14.6615 7.08895 14.6615 7.43854 V 9.50521 M 14.6577 6.50521 C 14.6455 5.60514 14.5934 5.06481 14.3708 4.6279 C 14.1151 4.12613 13.7072 3.71819 13.2054 3.46252 C 12.635 3.17188 11.8883 3.17188 10.3948 3.17188 H 5.59479 C 4.10132 3.17188 3.35458 3.17188 2.78415 3.46252 C 2.28238 3.71819 1.87444 4.12613 1.61877 4.6279 C 1.39616 5.06481 1.34405 5.60514 1.33185 6.50521 M 1.33185 6.50521 H 1.32812 M 1.33185 6.50521 C 1.32812 6.78028 1.32812 7.08895 1.32812 7.43854 V 9.57188 C 1.32812 11.0653 1.32812 11.8121 1.61877 12.3825 C 1.87444 12.8843 2.28238 13.2922 2.78415 13.5479 C 3.35458 13.8385 4.10132 13.8385 5.59479 13.8385 H 8.10677 M 5.99479 9.17188 H 3.99479");
  display: inline;
  opacity: 1;
}

.extracted-path-a79cw5 {
  d: path("M 11.2498 14.5786 L 12.6641 13.1644 M 12.6641 13.1644 L 14.0783 11.7502 M 12.6641 13.1644 L 11.2498 11.7502 M 12.6641 13.1644 L 14.0783 14.5786");
  display: inline;
  opacity: 1;
}

.extracted-div-group-lzbpnm {
  display: block;
  height: 626.195px;
  opacity: 1;
  overflow-x: hidden;
  overflow-y: hidden;
  position: relative;
  width: 588px;
}

.extracted-video-aspect-0-939-b7ap15 {
  border-radius: 24px;
  display: block;
  height: 626.195px;
  max-width: 100%;
  opacity: 1;
  width: 588px;
}

.extracted-button-absolute-pause-video-n7do6v {
  padding: 12px;
  border-radius: 1.67772e+07px;
  appearance: button;
  background-color: oklab(0 0 0 / 0.25);
  bottom: 16px;
  display: block;
  height: 48px;
  left: 16px;
  opacity: 0.9;
  position: absolute;
  right: 524px;
  text-align: center;
  top: 562.195px;
  transition-duration: 0.15s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  width: 48px;
}

.extracted-svg-rotate-90-video-progress-v7tpyy {
  display: block;
  height: 48px;
  opacity: 1;
  overflow-x: hidden;
  overflow-y: hidden;
  position: absolute;
  rotate: -90deg;
  width: 48px;
}

.extracted-circle-opacity-90-s5ck6g {
  cx: 16px;
  cy: 16px;
  display: inline;
  opacity: 0.9;
  r: 14.8px;
}

.extracted-svg-lucide-b2rrrl {
  display: block;
  height: 24px;
  opacity: 1;
  overflow-x: hidden;
  overflow-y: hidden;
  position: relative;
  width: 24px;
}

.extracted-rect-arjp8w {
  display: inline;
  height: 16px;
  opacity: 1;
  rx: 1px;
  width: 4px;
  x: 14px;
  y: 4px;
}

.extracted-rect-ofrkps {
  display: inline;
  height: 16px;
  opacity: 1;
  rx: 1px;
  width: 4px;
  x: 6px;
  y: 4px;
}
```

## 3. Assets

### Fonts
`Inter, Inter Fallback, ui-sans-serif, system-ui, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji`

## 4. Usage Example

```typescript
import { Container } from '@/components/Container'

export default function Page() {
  return (
    <Container />
  )
}
```

## 5. Notes for Implementation

- Replace static text with props for reusability
- Consider extracting colors/spacing into design tokens
- Add event handlers as needed
- Update image paths to your project structure
