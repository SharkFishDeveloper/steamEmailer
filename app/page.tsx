import TrackerClient from "./components/Trackerclient";


export default function Home() {
  return (
    <div className="min-h-screen text-[#c7d5e0]" style={{ background: "#1b2838" }}>
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center gap-4 sticky top-0 z-10"
        style={{ background: "#171a21", borderBottom: "1px solid #2a475e" }}
      >
        <h1
          className="text-lg font-bold leading-none"
          style={{ color: "#66c0f4", fontFamily: "Georgia, serif" }}
        >
          Steam Price Tracker
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <TrackerClient />
      </div>
    </div>
  );
}