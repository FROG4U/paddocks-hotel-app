import { getSettings, parseHours } from "@/lib/data";
import { saveSettingsAction } from "@/lib/actions";
import { Text, TextArea, ImageField, SaveBar, SavedBanner, Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await getSettings();
  const hours = parseHours(s.hoursJson);
  const rows = [...hours];
  while (rows.length < 5) rows.push({ label: "", value: "" });

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-6">Contact & Settings</h1>
      <SavedBanner show={saved === "1"} />

      <form action={saveSettingsAction}>
        <Card title="Business">
          <Text label="Site name" name="siteName" defaultValue={s.siteName} />
          <Text label="Tagline" name="tagline" defaultValue={s.tagline} />
          <ImageField label="Logo" name="logoFile" current={s.logoUrl} />
        </Card>

        <Card title="Contact details">
          <Text label="Address line 1" name="addressLine1" defaultValue={s.addressLine1} />
          <Text label="Address line 2" name="addressLine2" defaultValue={s.addressLine2} />
          <div className="grid grid-cols-2 gap-4">
            <Text label="Town" name="town" defaultValue={s.town} />
            <Text label="Postcode" name="postcode" defaultValue={s.postcode} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Text label="Phone" name="phone" defaultValue={s.phone} />
            <Text label="Email" name="email" defaultValue={s.email} />
          </div>
          <Text label="Map search address" name="mapQuery" defaultValue={s.mapQuery}
            hint="What the contact-page map pins to. Full address works best." />
        </Card>

        <Card title="Opening hours">
          {rows.map((h, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <Text label={i === 0 ? "Day(s)" : ""} name={`hours_label_${i}`} defaultValue={h.label} placeholder="e.g. Mon–Fri" />
              <Text label={i === 0 ? "Hours" : ""} name={`hours_value_${i}`} defaultValue={h.value} placeholder="e.g. 5pm – 10.30pm" />
            </div>
          ))}
          <p className="text-xs text-ink/50">Leave a row blank to remove it.</p>
        </Card>

        <Card title="Social & booking">
          <Text label="Facebook URL" name="facebookUrl" defaultValue={s.facebookUrl} />
          <Text label="Instagram URL" name="instagramUrl" defaultValue={s.instagramUrl} />
          <Text label="Google URL" name="googleUrl" defaultValue={s.googleUrl} hint="Your Google Business / reviews link — leave blank to hide the icon" />
          <Text label="TikTok URL" name="tiktokUrl" defaultValue={s.tiktokUrl} hint="Leave blank to hide the icon" />
          <div className="grid grid-cols-2 gap-4">
            <Text label="Booking button text" name="bookCtaLabel" defaultValue={s.bookCtaLabel} />
            <Text label="Booking button link" name="bookCtaHref" defaultValue={s.bookCtaHref} hint="e.g. /contact" />
          </div>
        </Card>

        <Card title="Brand colours">
          <div className="grid grid-cols-2 gap-4">
            <Text label="Navy (header)" name="navyColor" defaultValue={s.navyColor} />
            <Text label="Gold (nav text)" name="goldColor" defaultValue={s.goldColor} />
            <Text label="Button (tan)" name="buttonColor" defaultValue={s.buttonColor} />
            <Text label="Accent (red)" name="accentColor" defaultValue={s.accentColor} />
          </div>
        </Card>

        <Card title="SEO & footer">
          <Text label="Default browser tab title" name="metaTitle" defaultValue={s.metaTitle} />
          <TextArea label="Default search description" name="metaDescription" defaultValue={s.metaDescription} rows={2} />
          <Text label="Footer copyright line" name="footerNote" defaultValue={s.footerNote} />
        </Card>

        <SaveBar />
      </form>
    </div>
  );
}
