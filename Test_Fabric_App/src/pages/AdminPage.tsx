import { useEffect, useMemo, useState } from "react";
import {
  createDependency,
  createMapping,
  createProgrammeDefinition,
  createSummaryMembership,
  loadProgrammeAdminConfiguration,
  retireDependency,
  retireMapping,
  retireProgrammeDefinition,
  retireSummaryMembership,
  updateDependency,
  updateMapping,
  updateProgrammeDefinition,
  updateSummaryMembership,
  type DependencyInput,
  type MappingInput,
  type ProgrammeAdminConfiguration,
  type ProgrammeAdminDefinition,

  type ProgrammeDefinitionInput,
} from "@/services/programmeAdminService";
import { TARGET_PROGRAMME_STAGES } from "@/domain/targetProgrammeStages";
import { useAuth } from "@/hooks/AuthContext";

 type AdminSection = "definitions" | "summary" | "dependencies" | "mappings";

const emptyDefinition: ProgrammeDefinitionInput = {
  itemCode: "", programmeArea: "target", stageCode: "land-activation", rowLabel: "",
  rowType: "activity", sortOrder: 0, levelCode: "", isEditable: true, isDerived: false,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span>{label}</span><div className="mt-1">{children}</div></label>;
}

const inputClass = "block w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#006838] focus:ring-4 focus:ring-[#8fb73e]/20";

export function AdminPage() {
  const { signOut, user } = useAuth();
  const [section, setSection] = useState<AdminSection>("definitions");
  const [configuration, setConfiguration] = useState<ProgrammeAdminConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [definition, setDefinition] = useState<ProgrammeDefinitionInput>(emptyDefinition);
  const [editingDefinitionId, setEditingDefinitionId] = useState<string | null>(null);
  const [summaryForm, setSummaryForm] = useState({ parent: "", child: "", sortOrder: 0 });

  const [dependencyForm, setDependencyForm] = useState<DependencyInput>({ predecessor_item_definition_guid: "", successor_item_definition_guid: "", dependency_type: "FS", lag_days: 0, successor_field: "target_end" });

  const [mappingForm, setMappingForm] = useState<MappingInput>({ reporting_item_definition_guid: "", reporting_field: "reporting_start", target_item_definition_guid: "", target_field: "target_start", reporting_reference_item_definition_guid: undefined });
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setConfiguration(await loadProgrammeAdminConfiguration());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load programme configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function save(action: () => Promise<unknown>) {
    setStatus("Saving..."); setError(null);
    try { await action(); await reload(); setStatus("Saved"); }
    catch (err) { setStatus("Save failed"); setError(err instanceof Error ? err.message : "Unable to save programme configuration."); }
  }

  const definitions = useMemo(() => configuration?.definitions ?? [], [configuration]);
  const activeDefinitions = useMemo(() => definitions.filter((item) => item.is_active), [definitions]);
  const targetDefinitions = activeDefinitions.filter((item) => item.programme_area === "target" && ["activity", "milestone"].includes(item.row_type));
  const reportingDefinitions = activeDefinitions.filter((item) => item.programme_area === "reporting");
  const references = activeDefinitions.filter((item) => item.programme_area === "target" && item.row_type === "reporting_reference");
  const definitionByGuid = useMemo(() => new Map(definitions.map((item) => [item.guid, item])), [definitions]);
  const label = (guid: string) => { const item = definitionByGuid.get(guid); return item ? `${item.row_label} (${item.item_code})` : guid; };

  function beginDefinitionEdit(item: ProgrammeAdminDefinition) {
    setEditingDefinitionId(item.id);
    setDefinition({ itemCode: item.item_code, programmeArea: item.programme_area as ProgrammeDefinitionInput["programmeArea"], stageCode: item.stage_code, rowLabel: item.row_label, rowType: item.row_type as ProgrammeDefinitionInput["rowType"], sortOrder: item.sort_order, levelCode: item.level_code ?? "", isEditable: item.is_editable, isDerived: item.is_derived });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading Programme Admin...</div>;

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div><p className="text-sm font-semibold text-[#006838]">Fabric Rayfin · Admin</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Programme configuration</h1></div>
          <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 md:inline">{user?.email}</span><button type="button" onClick={() => void signOut()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium">Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-6 flex flex-wrap gap-2 rounded-4xl border border-slate-200 bg-white p-3 shadow-sm">
          {(["definitions", "summary", "dependencies", "mappings"] as AdminSection[]).map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${section === item ? "bg-[#025437] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item === "summary" ? "Summary memberships" : item === "mappings" ? "Reporting mappings" : item}</button>)}
          <span className="ml-auto self-center text-sm text-slate-500">{status}</span>
        </div>
        {error ? <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {section === "definitions" ? <section className="space-y-6">
          <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Definitions</h2><p className="mt-1 text-sm text-slate-500">Maintain stable programme item definitions. Retired records remain visible and cannot be deleted.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Item code"><input className={inputClass} value={definition.itemCode} disabled={Boolean(editingDefinitionId)} onChange={(e) => setDefinition({ ...definition, itemCode: e.target.value })} /></Field>
              <Field label="Programme area"><select className={inputClass} value={definition.programmeArea} onChange={(e) => setDefinition({ ...definition, programmeArea: e.target.value as ProgrammeDefinitionInput["programmeArea"] })}><option value="reporting">reporting</option><option value="target">target</option></select></Field>
              <Field label="Stage code">{definition.programmeArea === "target" ? <select className={inputClass} value={definition.stageCode} onChange={(e) => setDefinition({ ...definition, stageCode: e.target.value })}>{TARGET_PROGRAMME_STAGES.map((stage) => <option key={stage.code} value={stage.code}>{stage.code}</option>)}</select> : <input className={inputClass} value={definition.stageCode} onChange={(e) => setDefinition({ ...definition, stageCode: e.target.value })} />}</Field>
              <Field label="Row label"><input className={inputClass} value={definition.rowLabel} onChange={(e) => setDefinition({ ...definition, rowLabel: e.target.value })} /></Field>
              <Field label="Row type"><select className={inputClass} value={definition.rowType} onChange={(e) => setDefinition({ ...definition, rowType: e.target.value as ProgrammeDefinitionInput["rowType"] })}><option value="activity">activity</option><option value="milestone">milestone</option><option value="summary">summary</option><option value="reporting_reference">reporting_reference</option></select></Field>
              <Field label="Sort order"><input className={inputClass} type="number" min="0" step="1" value={definition.sortOrder} onChange={(e) => setDefinition({ ...definition, sortOrder: Number(e.target.value) })} /></Field>
              <Field label="Level code"><input className={inputClass} value={definition.levelCode} onChange={(e) => setDefinition({ ...definition, levelCode: e.target.value })} /></Field>
              <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={definition.isEditable} onChange={(e) => setDefinition({ ...definition, isEditable: e.target.checked })} /> Editable</label>
              <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={definition.isDerived} onChange={(e) => setDefinition({ ...definition, isDerived: e.target.checked })} /> Derived</label>
            </div>
            <div className="mt-5 flex gap-3"><button type="button" onClick={() => void save(() => editingDefinitionId ? updateProgrammeDefinition(editingDefinitionId, definition) : createProgrammeDefinition(definition))} className="rounded-full bg-[#025437] px-5 py-2.5 text-sm font-semibold text-white">{editingDefinitionId ? "Save definition" : "Create definition"}</button>{editingDefinitionId ? <button type="button" onClick={() => { setEditingDefinitionId(null); setDefinition(emptyDefinition); }} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold">Cancel</button> : null}</div>
          </div>
          <div className="overflow-x-auto rounded-4xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-4">Code</th><th className="px-5 py-4">Label</th><th className="px-5 py-4">Area / stage</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{definitions.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold">{item.item_code}</td><td className="px-5 py-4">{item.row_label}</td><td className="px-5 py-4">{item.programme_area} · {item.stage_code}</td><td className="px-5 py-4">{item.row_type}</td><td className="px-5 py-4">{item.is_active ? "Active" : "Retired"}</td><td className="px-5 py-4"><div className="flex gap-2">{item.is_active ? <><button type="button" onClick={() => beginDefinitionEdit(item)} className="font-semibold text-[#006838]">Edit</button><button type="button" onClick={() => void save(() => retireProgrammeDefinition(item.id))} className="font-semibold text-red-700">Retire</button></> : null}</div></td></tr>)}</tbody></table></div>
        </section> : null}

        {section === "summary" && configuration ? <section className="space-y-6"><RelationshipForm title="Summary memberships" description="Connect summary definitions to child definitions, including nested summaries." onSave={() => void save(() => createSummaryMembership({ summary_item_definition_guid: summaryForm.parent, child_item_definition_guid: summaryForm.child, sort_order: summaryForm.sortOrder }).then(() => setSummaryForm({ parent: "", child: "", sortOrder: 0 })))}><Field label="Summary parent"><select className={inputClass} value={summaryForm.parent} onChange={(e) => setSummaryForm({ ...summaryForm, parent: e.target.value })}><option value="">Select summary</option>{activeDefinitions.filter((item) => item.row_type === "summary").map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Child definition"><select className={inputClass} value={summaryForm.child} onChange={(e) => setSummaryForm({ ...summaryForm, child: e.target.value })}><option value="">Select child</option>{activeDefinitions.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Sort order"><input className={inputClass} type="number" min="0" value={summaryForm.sortOrder} onChange={(e) => setSummaryForm({ ...summaryForm, sortOrder: Number(e.target.value) })} /></Field></RelationshipForm><RelationshipTable headers={["Parent", "Child", "Order"]} rows={configuration.summaryMemberships} render={(item) => [label(item.summary_item_definition_guid), label(item.child_item_definition_guid), String(item.sort_order)]} actions={(item) => <><button type="button" onClick={() => { const value = Number(window.prompt("Sort order", String(item.sort_order))); if (Number.isInteger(value) && value >= 0) void save(() => updateSummaryMembership(item.id, value)); }} className="font-semibold text-[#006838]">Edit order</button><button type="button" onClick={() => void save(() => retireSummaryMembership(item.id))} className="font-semibold text-red-700">Retire</button></>} /></section> : null}

        {section === "dependencies" && configuration ? <section className="space-y-6"><RelationshipForm title="Dependencies" description="Maintain active FS dependencies between Target activities and milestones." onSave={() => void save(() => createDependency(dependencyForm).then(() => setDependencyForm({ predecessor_item_definition_guid: "", successor_item_definition_guid: "", dependency_type: "FS", lag_days: 0, successor_field: "target_end" })))}><Field label="Predecessor"><select className={inputClass} value={dependencyForm.predecessor_item_definition_guid} onChange={(e) => setDependencyForm({ ...dependencyForm, predecessor_item_definition_guid: e.target.value })}><option value="">Select predecessor</option>{targetDefinitions.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Successor"><select className={inputClass} value={dependencyForm.successor_item_definition_guid} onChange={(e) => setDependencyForm({ ...dependencyForm, successor_item_definition_guid: e.target.value })}><option value="">Select successor</option>{targetDefinitions.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Type"><select className={inputClass} value={dependencyForm.dependency_type} onChange={(e) => setDependencyForm({ ...dependencyForm, dependency_type: e.target.value })}><option value="FS">FS</option></select></Field><Field label="Lag days"><input className={inputClass} type="number" value={dependencyForm.lag_days} onChange={(e) => setDependencyForm({ ...dependencyForm, lag_days: Number(e.target.value) })} /></Field><Field label="Controls"><select className={inputClass} value={dependencyForm.successor_field} onChange={(e) => setDependencyForm({ ...dependencyForm, successor_field: e.target.value })}><option value="target_start">target_start</option><option value="target_end">target_end</option></select></Field></RelationshipForm><RelationshipTable headers={["Predecessor", "Successor", "Type", "Lag", "Field"]} rows={configuration.dependencies} render={(item) => [label(item.predecessor_item_definition_guid), label(item.successor_item_definition_guid), item.dependency_type, String(item.lag_days), item.successor_field]} actions={(item) => <><button type="button" onClick={() => { const lag = Number(window.prompt("Lag days", String(item.lag_days))); if (Number.isInteger(lag)) void save(() => updateDependency(item.id, { predecessor_item_definition_guid: item.predecessor_item_definition_guid, successor_item_definition_guid: item.successor_item_definition_guid, dependency_type: item.dependency_type, lag_days: lag, successor_field: item.successor_field })); }} className="font-semibold text-[#006838]">Edit lag</button><button type="button" onClick={() => void save(() => retireDependency(item.id))} className="font-semibold text-red-700">Retire</button></>} /></section> : null}

        {section === "mappings" && configuration ? <section className="space-y-6"><RelationshipForm title="Reporting mappings" description="Map explicit Reporting fields to Target fields by definition identity." onSave={() => void save(() => editingMappingId ? updateMapping(editingMappingId, mappingForm).then(() => { setEditingMappingId(null); }) : createMapping(mappingForm).then(() => setMappingForm({ reporting_item_definition_guid: "", reporting_field: "reporting_start", target_item_definition_guid: "", target_field: "target_start", reporting_reference_item_definition_guid: undefined })))}><Field label="Reporting source"><select className={inputClass} value={mappingForm.reporting_item_definition_guid} onChange={(e) => setMappingForm({ ...mappingForm, reporting_item_definition_guid: e.target.value })}><option value="">Select reporting definition</option>{reportingDefinitions.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Reporting field"><select className={inputClass} value={mappingForm.reporting_field} onChange={(e) => setMappingForm({ ...mappingForm, reporting_field: e.target.value })}><option value="reporting_start">reporting_start</option><option value="reporting_end">reporting_end</option></select></Field><Field label="Target definition"><select className={inputClass} value={mappingForm.target_item_definition_guid} onChange={(e) => setMappingForm({ ...mappingForm, target_item_definition_guid: e.target.value })}><option value="">Select Target definition</option>{targetDefinitions.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field><Field label="Target field"><select className={inputClass} value={mappingForm.target_field} onChange={(e) => setMappingForm({ ...mappingForm, target_field: e.target.value })}><option value="target_start">target_start</option><option value="target_end">target_end</option></select></Field><Field label="Optional reference"><select className={inputClass} value={mappingForm.reporting_reference_item_definition_guid ?? ""} onChange={(e) => setMappingForm({ ...mappingForm, reporting_reference_item_definition_guid: e.target.value || undefined })}><option value="">None</option>{references.map((item) => <option key={item.guid} value={item.guid}>{label(item.guid)}</option>)}</select></Field></RelationshipForm><RelationshipTable headers={["Reporting", "Target", "Fields", "Reference"]} rows={configuration.mappings} render={(item) => [label(item.reporting_item_definition_guid), label(item.target_item_definition_guid), `${item.reporting_field} → ${item.target_field}`, item.reporting_reference_item_definition_guid ? label(item.reporting_reference_item_definition_guid) : "—"]} actions={(item) => <><button type="button" onClick={() => { setMappingForm({ reporting_item_definition_guid: item.reporting_item_definition_guid, reporting_field: item.reporting_field, target_item_definition_guid: item.target_item_definition_guid, target_field: item.target_field, reporting_reference_item_definition_guid: item.reporting_reference_item_definition_guid }); setEditingMappingId(item.id); }} className="font-semibold text-[#006838]">Edit</button><button type="button" onClick={() => { const form = { reporting_item_definition_guid: item.reporting_item_definition_guid, reporting_field: item.reporting_field, target_item_definition_guid: item.target_item_definition_guid, target_field: item.target_field, reporting_reference_item_definition_guid: item.reporting_reference_item_definition_guid }; void save(() => updateMapping(item.id, form)); }} className="font-semibold text-[#006838]">Save</button><button type="button" onClick={() => void save(() => retireMapping(item.id))} className="font-semibold text-red-700">Retire</button></>} /></section> : null}
      </main>
    </div>
  );
}

function RelationshipForm({ title, description, children, onSave }: { title: string; description: string; children: React.ReactNode; onSave: () => void }) {
  return <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-5 grid gap-4 md:grid-cols-3">{children}</div><button type="button" onClick={onSave} className="mt-5 rounded-full bg-[#025437] px-5 py-2.5 text-sm font-semibold text-white">Create</button></div>;
}

function RelationshipTable<T extends { id: string }>({ headers, rows, render, actions }: { headers: string[]; rows: T[]; render: (row: T) => string[]; actions: (row: T) => React.ReactNode }) {
  return <div className="overflow-x-auto rounded-4xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-5 py-4">{header}</th>)}<th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}>{render(row).map((value, index) => <td key={`${row.id}-${index}`} className="px-5 py-4">{value}</td>)}<td className="px-5 py-4"><div className="flex gap-3">{actions(row)}</div></td></tr>)}</tbody></table></div>;
}
