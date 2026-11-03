"use client";

import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useEffect, useState } from "react";

function itemsForViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? 7 : 1;
}

function CarouselControl({ disabled, onClick, title, type }) {
  return (
    <button aria-label={title} className={`flex h-10 w-10 items-center justify-center bg-transparent text-[#2F7A57] transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${type === "previous" ? "rotate-180" : ""}`} disabled={disabled} onClick={onClick} title={title} type="button">
      <IconArrowNarrowRight aria-hidden="true" />
    </button>
  );
}

// Adapted from the Aceternity carousel installer for content-based slides.
export default function Carousel({ initialPosition = "end", onSlideChange, renderSlide, slides }) {
  const [itemsPerView, setItemsPerView] = useState(itemsForViewport);
  const [current, setCurrent] = useState(() => initialPosition === "start" ? 0 : Math.max(0, slides.length - itemsForViewport()));
  const lastStart = Math.max(0, slides.length - itemsPerView);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateItemsPerView = () => setItemsPerView(mediaQuery.matches ? 7 : 1);
    updateItemsPerView();
    mediaQuery.addEventListener("change", updateItemsPerView);
    return () => mediaQuery.removeEventListener("change", updateItemsPerView);
  }, []);

  useEffect(() => {
    setCurrent((index) => Math.min(index, lastStart));
  }, [lastStart]);

  useEffect(() => {
    onSlideChange?.(slides.slice(current, current + itemsPerView));
  }, [current, itemsPerView, onSlideChange, slides]);

  return (
    <section>
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${current * (100 / itemsPerView)}%)` }}>
          {slides.map((slide, index) => (
            <div className="shrink-0 px-2" key={slide} style={{ flexBasis: `${100 / itemsPerView}%` }}>
              {renderSlide(
                slide,
                index >= current && index < current + itemsPerView,
                index >= current - 1 && index <= current + itemsPerView,
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-3">
        <CarouselControl disabled={current === 0} onClick={() => setCurrent((index) => index - 1)} title="Go to earlier dates" type="previous" />
        <CarouselControl disabled={current === lastStart} onClick={() => setCurrent((index) => index + 1)} title="Go to later dates" type="next" />
      </div>
    </section>
  );
}
