import { useState } from 'react';
import type { GemLeaderboardEntry, PlayerStats, SubmitScoreResponse } from '../../shared/api';
import type { AudioManager } from '../lib/audio';
import { LootModal } from './LootModal';

type GameOverlayProps = {
  /** Show restart only during dead phase; always show the icon buttons */
  showRestart: boolean;
  onRestart: () => void;
  stats: PlayerStats | null;
  gemLeaderboard: GemLeaderboardEntry[];
  lastResult: SubmitScoreResponse | null;
  audioManager: AudioManager | null;
};

// ─── Small pixel-art icon button ──────────────────────────────────────────────

type IconButtonProps = {
  label: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
};

const IconButton = ({ label, icon, onClick, active = false }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={[
      'w-9 h-9 flex items-center justify-center rounded text-base',
      'border-2 transition-colors select-none',
      active
        ? 'bg-[#ffd700] border-[#ffd700] text-[#0f3460]'
        : 'bg-[#0f3460]/80 border-[#3a80b8] text-white hover:bg-[#1a4a7a]/90 hover:border-[#ffd700]',
    ].join(' ')}
    style={{ fontFamily: '"Courier New", Courier, monospace' }}
  >
    {icon}
  </button>
);

// ─── Settings popover ─────────────────────────────────────────────────────────

type SettingsPopoverProps = {
  onClose: () => void;
};

const SettingsPopover = ({ onClose }: SettingsPopoverProps) => (
  <div
    className="absolute top-12 right-0 z-40 w-52 bg-[#16213e] border-2 border-[#3a80b8] rounded-lg shadow-xl p-3"
    style={{ fontFamily: '"Courier New", Courier, monospace' }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-[#5ba3d0] text-xs uppercase tracking-widest">Settings</p>
      <button
        type="button"
        aria-label="Close settings"
        className="text-[#ffd700] text-sm leading-none hover:text-white"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
    <ul className="flex flex-col gap-2 text-sm text-[#c8e6f5]">
      <li className="text-[#3a80b8] text-xs italic">
        More settings coming soon…
      </li>
    </ul>
  </div>
);

// ─── Overlay component ────────────────────────────────────────────────────────

export const GameOverlay = ({
  showRestart,
  onRestart,
  stats,
  gemLeaderboard,
  lastResult,
  audioManager,
}: GameOverlayProps) => {
  const [lootOpen, setLootOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(() => audioManager?.isMuted() ?? false);

  const handleAudioToggle = () => {
    if (!audioManager) return;
    const next = audioManager.toggleMuted();
    setMuted(next);
    // Close settings if open to avoid overlap
    setSettingsOpen(false);
  };

  const handleSettingsToggle = () => {
    setSettingsOpen((v) => !v);
    setLootOpen(false);
  };

  const handleLootToggle = () => {
    setLootOpen((v) => !v);
    setSettingsOpen(false);
  };

  return (
    <>
      {/* ── Top-left: Restart icon (small, stays in canvas corner) ── */}
      {showRestart && (
        <div className="absolute top-2 left-2 z-30">
          <button
            type="button"
            aria-label="Restart game"
            onClick={onRestart}
            className={[
              'w-9 h-9 flex items-center justify-center rounded text-lg font-bold',
              'bg-[#0f3460]/80 border-2 border-[#3a80b8] text-white',
              'hover:bg-[#d93900] hover:border-[#d93900] transition-colors select-none',
            ].join(' ')}
            style={{ fontFamily: '"Courier New", Courier, monospace' }}
          >
            ↺
          </button>
        </div>
      )}

      {/* ── Top-right: Loot / Settings / Audio ── */}
      <div className="absolute top-2 right-2 z-30 flex gap-1.5">
        <IconButton
          label="Loot and rewards"
          icon="💎"
          onClick={handleLootToggle}
          active={lootOpen}
        />
        <div className="relative">
          <IconButton
            label="Settings"
            icon="⚙"
            onClick={handleSettingsToggle}
            active={settingsOpen}
          />
          {settingsOpen && (
            <SettingsPopover onClose={() => setSettingsOpen(false)} />
          )}
        </div>
        <IconButton
          label={muted ? 'Unmute audio' : 'Mute audio'}
          icon={muted ? '🔇' : '🔊'}
          onClick={handleAudioToggle}
          active={muted}
        />
      </div>

      {/* ── Loot modal (portal-style, covers whole screen) ── */}
      {lootOpen && (
        <LootModal
          stats={stats}
          gemLeaderboard={gemLeaderboard}
          lastResult={lastResult}
          onClose={() => setLootOpen(false)}
        />
      )}
    </>
  );
};
