import { Input, Label } from "./ui";

// Společná pole profilu závodníka (registrace i úprava účtu).
export default function ProfileFields({ form, update }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Jméno</Label>
          <Input required autoComplete="given-name" value={form.first_name || ""} onChange={(e) => update("first_name", e.target.value)} />
        </div>
        <div>
          <Label>Příjmení</Label>
          <Input required autoComplete="family-name" value={form.last_name || ""} onChange={(e) => update("last_name", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label>Rok narození</Label>
          <Input type="number" min={1900} max={2100} value={form.birth_year ?? ""}
            onChange={(e) => update("birth_year", e.target.value === "" ? null : Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <Label>Oddíl / parta</Label>
          <Input value={form.club || ""} onChange={(e) => update("club", e.target.value)} placeholder="např. OK Jiskra" />
        </div>
      </div>
      <div>
        <Label>Telefon</Label>
        <Input type="tel" autoComplete="tel" value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="+420…" />
      </div>
    </>
  );
}
