import { deployState } from "@/lib/deploy";
import { startDeployAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
}

export default async function UpdatePage({ searchParams }:
  { searchParams: Promise<{ started?: string; error?: string }> }) {
  const { started, error } = await searchParams;
  const state = deployState();

  const finished = !state.running && state.log;
  const failed = finished && /FAILED|TIMED OUT|has NOT been|Could not/.test(state.log);
  const upToDate = finished && state.log.includes("Already up to date");
  const succeeded = finished && state.log.includes("The new version is live");

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Update the Website</h1>
      <p className="text-ink/60 mb-6">
        Publishes the latest changes. The site keeps running throughout, and is only
        swapped over once the new version has been built successfully.
      </p>
      <SavedBanner show={started === "1"} text="Update started. It takes a couple of minutes. Refresh this page to follow along." />
      <ErrorBanner message={error} />

      <Card title={state.running ? "Updating now" : "Publish the latest changes"}>
        {state.running ? (
          <>
            <p className="text-sm text-ink/70">
              Started {when(state.startedAt)}. This usually takes one to three minutes.
              You can close this page; it carries on by itself.
            </p>
            <a href="/admin/update" className="bg-navy text-white font-semibold rounded-md px-5 py-2.5 hover:bg-navy/90 inline-block">
              Refresh
            </a>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/70">
              Press this after I have told you something new is ready. It fetches the latest
              version, builds it and restarts the site.
            </p>
            <form action={startDeployAction}>
              <button className="bg-navy text-white font-semibold rounded-md px-6 py-3 hover:bg-navy/90">
                Update the website now
              </button>
            </form>
          </>
        )}
      </Card>

      {finished && (
        <div className={`mb-6 rounded-md text-sm px-4 py-3 ${
          failed ? "bg-red-600 text-white"
          : succeeded ? "bg-green-600 text-white"
          : upToDate ? "bg-cream text-ink/80" : "bg-cream text-ink/80"}`}>
          {failed
            ? "The update did not complete. Your website is untouched and still running the previous version. The details are below; send them to me and I will sort it."
            : succeeded ? "Updated. The new version is live."
            : upToDate ? "There was nothing new to publish."
            : "Finished."}
        </div>
      )}

      {state.log && (
        <Card title="What happened">
          <pre className="text-xs bg-cream/60 rounded-md p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[28rem] overflow-y-auto">
            {state.log}
          </pre>
        </Card>
      )}

      <Card title="Automatic updates">
        <p className="text-sm text-ink/70">
          {process.env.DEPLOY_KEY
            ? "Set up. New work publishes itself within a minute or two of being finished, and this page is only needed if you want to push it along by hand."
            : "Not set up yet. Until it is, press the button above when I tell you something is ready."}
        </p>
        {!process.env.DEPLOY_KEY && (
          <ol className="text-sm text-ink/70 list-decimal pl-5 space-y-1">
            <li>
              In Plesk, under the domain, Node.js, Custom environment variables, add{" "}
              <code className="bg-cream px-1 rounded">DEPLOY_KEY</code> with a long random password as its value.
            </li>
            <li>Restart the app.</li>
            <li>Send me that same value and I will add it to GitHub, or add it yourself as a repository secret named DEPLOY_KEY.</li>
          </ol>
        )}
        <p className="text-xs text-ink/50">
          Your rooms, bookings, photos and settings are never touched by an update. They are
          kept outside the part of the server that gets replaced.
        </p>
      </Card>
    </div>
  );
}
