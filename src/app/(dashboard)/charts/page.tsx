import { ChartsClientPage } from "./ChartsClientPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ChartsPage() {
  return (
    <ErrorBoundary inline>
      <ChartsClientPage />
    </ErrorBoundary>
  );
}