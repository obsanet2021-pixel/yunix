import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import previewDashboard from "@/assets/preview-dashboard.png";
import previewAnalytics from "@/assets/preview-analytics.png";
import previewJournal from "@/assets/preview-journal.png";

const slides = [
  { image: previewDashboard, label: "Trading Dashboard" },
  { image: previewAnalytics, label: "Analytics & Insights" },
  { image: previewJournal, label: "Trade Journal" },
];

const PlatformPreviewSlideshow = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    // Auto-play
    const autoplay = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 4000);

    return () => {
      clearInterval(autoplay);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0"
            >
              <img
                src={slide.image}
                alt={slide.label}
                className="w-full h-auto object-cover aspect-[16/9]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to ${slide.label}`}
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-center text-sm text-muted-foreground mt-2">
        {slides[selectedIndex].label}
      </p>
    </div>
  );
};

export default PlatformPreviewSlideshow;
