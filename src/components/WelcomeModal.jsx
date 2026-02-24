import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Bot, Workflow, Key, Rocket, ChevronRight, ChevronLeft, X } from 'lucide-react';

const SLIDES = [
  {
    icon: Bot,
    color: '#3B82F6',
    title: 'Welcome to AI Agent Dashboard',
    description:
      'Your all-in-one platform for building, training, and deploying intelligent AI agents. Let\'s take a quick tour of what you can do.',
  },
  {
    icon: Workflow,
    color: '#8B5CF6',
    title: 'Build Visually',
    description:
      'Design agent workflows with a drag-and-drop node canvas. Connect LLM calls, tools, conditions, and data transforms into powerful pipelines — no code required.',
  },
  {
    icon: Key,
    color: '#F59E0B',
    title: 'Connect Providers',
    description:
      'Head to Settings to add your API keys for Claude, OpenAI, Kimi, MiniMax, or connect a local model. Your keys are encrypted and never leave your device.',
  },
  {
    icon: Rocket,
    color: '#10B981',
    title: 'Ready to Build',
    description:
      'Create your first agent from the Dashboard, design its workflow in the Agent Builder, then train and deploy. Let\'s get started!',
  },
];

export default function WelcomeModal({ open, onClose, onStartTour }) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const Icon = current.icon;
  const isLast = slide === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      onStartTour?.();
    } else {
      setSlide((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] animate-in fade-in zoom-in-95">
          <div className="bg-[var(--sf)]/95 backdrop-blur-xl border border-[var(--glassBd)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--dm)] hover:text-[var(--tx)] hover:bg-white/5 transition-colors z-10"
            >
              <X size={16} />
            </button>

            {/* Slide content */}
            <div className="px-8 pt-10 pb-6 text-center">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: `${current.color}15` }}
              >
                <Icon size={32} style={{ color: current.color }} />
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-[var(--hd)] mb-3">
                {current.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-[var(--sb)] leading-relaxed max-w-sm mx-auto">
                {current.description}
              </p>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8">
              {/* Dots */}
              <div className="flex justify-center gap-2 mb-6">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === slide
                        ? 'bg-[var(--blue)] w-6'
                        : 'bg-[var(--bd)] hover:bg-[var(--dm)]'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                {slide > 0 ? (
                  <button
                    onClick={() => setSlide((s) => s - 1)}
                    className="flex items-center gap-1 text-xs text-[var(--dm)] hover:text-[var(--tx)] transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Back
                  </button>
                ) : (
                  <button
                    onClick={handleSkip}
                    className="text-xs text-[var(--dm)] hover:text-[var(--tx)] transition-colors"
                  >
                    Skip
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--blue)] hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLast ? 'Create Your First Agent' : 'Next'}
                  {!isLast && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
