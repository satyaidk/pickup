import Anatomy from "./components/Anatomy.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import TerminalDemo from "./components/TerminalDemo.jsx";
import WhyIBuiltThis from "./components/WhyIBuiltThis.jsx";
import Workbench from "./components/Workbench.jsx";

export default function App() {
  return (
    <>
      <a className="skip" href="#bench">Skip to the tool</a>
      <Header />
      <main id="top">
        <Hero />
        <Workbench />
        <Anatomy />
        <TerminalDemo />
        <WhyIBuiltThis />
      </main>
      <Footer />
    </>
  );
}
