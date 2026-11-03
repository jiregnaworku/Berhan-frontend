function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,rgba(233,185,73,0.12),transparent_30%),linear-gradient(135deg,#f3f7fb_0%,#e8f0f8_100%)] p-6">
      <section className="w-full max-w-2xl rounded-2xl border border-white/80 bg-white/[0.96] p-10 text-center shadow-[0_1.5rem_3.5rem_rgba(16,45,84,0.14)] max-[480px]:p-6">
        <img
          src="/images/berhan.png"
          alt="Berhan Bank"
          className="mx-auto mb-8 block max-h-20 max-w-[13rem] object-contain"
        />
        <h1 className="mb-3 text-3xl font-bold text-[#102d54]">
          Welcome to Berhan Bank
        </h1>
        <p className="text-[#718096]">
          Welcome to your dashboard. More features are coming soon.
        </p>
      </section>
    </main>
  )
}

export default HomePage
