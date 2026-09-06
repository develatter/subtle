import { useEditorStore } from "../state/editorStore";
import { ExportDialog } from "../ui/components/dialogs/ExportDialog";
import { ImportDialog } from "../ui/components/dialogs/ImportDialog";
import { InsertBlockDialog } from "../ui/components/dialogs/InsertBlockDialog";
import { Notice } from "../ui/components/feedback/Notice";
import { RelinkVideoButton } from "../ui/components/feedback/RelinkVideoButton";
import { StorageAlert } from "../ui/components/feedback/StorageAlert";
import { InspectorPanel } from "../ui/components/inspector/InspectorPanel";
import { Footer } from "../ui/components/layout/Footer";
import { NavigationRail } from "../ui/components/layout/NavigationRail";
import { TopBar } from "../ui/components/layout/TopBar";
import { PreviewPanel } from "../ui/components/preview/PreviewPanel";
import { TimelinePanel } from "../ui/components/timeline/TimelinePanel";
import { TranscriptPanel } from "../ui/components/transcript/TranscriptPanel";
import { FilePickersProvider } from "../ui/hooks/useFilePickers";
import { useKeyboardShortcuts } from "../ui/hooks/useKeyboardShortcuts";
import {
  useDemoClock,
  useLinkedVideo,
  useLocaleEffects,
  useNativeJobs,
  useObjectUrlCleanup,
  useSelectionGuard,
  useSystemFonts,
  useWindowClose,
} from "../ui/hooks/useLifecycle";

/** Application-wide effects, kept out of the layout tree. */
function AppEffects() {
  useLocaleEffects();
  useLinkedVideo();
  useWindowClose();
  useDemoClock();
  useObjectUrlCleanup();
  useSystemFonts();
  useNativeJobs();
  useSelectionGuard();
  useKeyboardShortcuts();
  return null;
}

function Dialogs() {
  const dialog = useEditorStore((s) => s.dialog);
  return (
    <>
      <InsertBlockDialog />
      {dialog === "import" && <ImportDialog />}
      {dialog === "export" && <ExportDialog />}
    </>
  );
}

/** Composition root: layout only, no editing logic. */
export default function App() {
  return (
    <FilePickersProvider>
      <AppEffects />
      <div className="app">
        <TopBar />
        <div className="workspace">
          <NavigationRail />
          <TranscriptPanel />
          <PreviewPanel />
          <InspectorPanel />
        </div>
        <TimelinePanel />
        <Footer />
        <StorageAlert />
        <RelinkVideoButton />
        <Notice />
        <Dialogs />
      </div>
    </FilePickersProvider>
  );
}
