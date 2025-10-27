import Spline from '@splinetool/react-spline';

export default function HeroCover() {
  return (
    <section className="relative w-full h-[48vh] md:h-[56vh]">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/OIGfFUmCnZ3VD8gH/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
      <div className="relative z-10 flex h-full items-center justify-center text-center px-6">
        <div>
          <h1 className="text-[#C4F0C2] text-2xl md:text-4xl font-semibold tracking-widest uppercase">TextForge: A Retro WordQuest</h1>
          <p className="mt-3 text-[#7CE8B5] text-xs md:text-sm tracking-widest uppercase">Where words become worlds — blend of text adventure, platformer, and RPG</p>
        </div>
      </div>
    </section>
  );
}
