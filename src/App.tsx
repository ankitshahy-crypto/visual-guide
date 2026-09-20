import ProjectDetail from "./pages/ProjectDetail";
import golden from "./data/golden/newtral-magich-pro.json";
import { assertGuide } from "./lib/validate";

// v1: one hard-wired project (the golden guide). Projects list + upload come next.
const guide = assertGuide(golden);

export default function App() {
  return <ProjectDetail guide={guide} projectName="Office chair" />;
}
