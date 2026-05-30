import AuroraHero from "@/components/ui/digital-aurora";

export default function DemoOne() {
  return (
    <AuroraHero
      title="Experience the Digital Aurora."
      description="A stunning, interactive hero section featuring a real-time volumetric aurora shader. Built with React and WebGL for a captivating user experience."
      badgeText="Generative Art"
      badgeLabel="Live Demo"
      ctaButtons={[
        { text: "Explore Now", href: "#", primary: true },
        { text: "Learn More", href: "#" }
      ]}
      microDetails={["Real-time rendering", "Interactive mouse influence", "Volumetric light simulation"]}
    />
  );
}
