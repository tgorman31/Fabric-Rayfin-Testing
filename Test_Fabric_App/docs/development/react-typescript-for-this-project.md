# React and TypeScript for this project

This is a reading guide for this repository, not a general React course. Examples are deliberately small and follow patterns in `ProjectIndexPage`, the programme services and domain helpers.

## TypeScript essentials

TypeScript adds names and checks to JavaScript values. The compiler can catch a wrong field name before the browser runs the code.

- `const` is a binding that should not be reassigned; `let` is used when the binding will change.
  ```ts
  const projectGuid = "example-guid";
  let saveState: SaveState = "idle";
  ```
- A type annotation describes a value: `const projectName: string = "Example"`.
- A `type` gives a name to a shape or choice. An `interface` is another way to describe an object shape; this project uses both styles where useful.
  ```ts
  type SaveState = "idle" | "saving" | "saved" | "error";
  type ProjectSummary = { projectGuid: string; projectName: string };
  ```
- A union (`A | B`) means one of several allowed values. Nullable values are explicit: `string | null` means a value may be absent; `field?: string` means the property may be omitted.
- Arrays and object shapes describe collections: `ProjectSummary[]` is an array of summaries; `{ projectGuid: string }` is an object with that property.
- Destructuring takes named values out of an object: `const { projectGuid, projectName } = summary`.
- Spread copies properties into a new object: `setDraft({ ...draft, projectName })`. It is useful for an immutable update, not a database write.
- `map` transforms every item, `filter` keeps matching items, and `find` returns the first match or `undefined`.
  ```ts
  const active = projects.filter((project) => project.isActive);
  const labels = active.map((project) => project.projectRef);
  const selected = projects.find((project) => project.projectGuid === projectGuid);
  ```
- Optional chaining (`?.`) stops safely when a value is absent: `configuration?.definitions`.
- Nullish coalescing (`??`) supplies a default only for `null` or `undefined`: `summary?.projectName ?? "Unnamed project"`.
- Functions and arrow functions are common in handlers and transformations: `const label = (value: string) => value.trim()`.
- `async` functions return a `Promise`. `await` waits for its result without blocking the rest of the browser. Rayfin service calls commonly use this pattern.
  ```ts
  async function reload() {
    const workspace = await getProjectIndexWorkspace(projectGuid);
    return workspace;
  }
  ```
- `try/catch` handles a rejected Promise or thrown error so the UI can show a useful failure state.
- `export` makes a value available to another file; `import` uses it. Pages import services and domain helpers rather than duplicating them.

## React concepts in this codebase

- A **component** is a function that returns JSX, the HTML-like description React renders. `ProgrammeTimelineRow` is a reusable component; `ProjectIndexPage` is a page component.
- **Props** are inputs passed to a component: `ReadonlyField` receives `{ label, value }`.
- **State** is data that can change while the page is open. `useState` creates state and a setter: `const [saveState, setSaveState] = useState<SaveState>("idle")`.
- `useEffect` runs side effects such as loading data after a project GUID changes. It should not be used as a substitute for ordinary calculations.
- `useMemo` caches a derived value until its dependencies change. Use it for meaningful derived work, not every expression.
- `useRef` stores a mutable value or DOM reference without causing a render. The current Project Index page uses refs for map/timeline interaction; do not confuse a ref with persisted data.
- An event handler responds to a browser event: `onChange={(event) => setValue(event.target.value)}` or `onClick={() => void save()}`.
- A controlled input gets its value from React state and reports changes through `onChange`. This is how editable project fields can validate and show save status.
- Collections are rendered with `map` and require a stable `key`: `{items.map((item) => <Row key={item.id} item={item} />)}`.
- Conditional rendering uses a condition: `{error ? <ErrorMessage /> : null}`. The page uses this for loading, errors, disabled tabs and access outcomes.

## Project-specific boundaries

- A **page** coordinates a route and a larger workspace. A **component** is a reusable part of a page. Keep large reusable visual pieces under `src/components/`.
- A **domain helper** contains business meaning such as stage editability, date derivation or cycle validation. A **service** loads/writes Rayfin data and coordinates domain rules.
- Do not make a component the database or business-rule layer. The UI can be bypassed or reused, so service checks and domain validation must remain outside JSX.
- **Optimistic UI** means the screen updates its local working copy before the server confirms the write. This can make editing feel immediate, but failures must restore or clearly report the unsaved state. The programme code uses a keyed write queue to order writes for the same record.
- Derived programme values, such as summary dates or dependency-driven fields, should be calculated from their sources rather than manually persisted as competing values. This avoids two dates disagreeing.

## A small flow to recognise

A field handler typically updates local state and calls a service; the service validates the project context and writes through the Rayfin client:

```tsx
function ProjectNameField({ summary, onSave }: {
  summary: ProjectSummary;
  onSave: (projectName: string) => Promise<void>;
}) {
  const [value, setValue] = useState(summary.projectName);

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void onSave(value)}
    />
  );
}
```

The real page adds validation, status feedback, error handling and service calls. The component should not import the Rayfin client directly.

## How to read a complicated React file

Use this order rather than trying to understand every line at once:

1. imports
2. types
3. constants
4. component props
5. state
6. derived values
7. effects
8. event handlers
9. JSX/render output

For example, in `ProjectIndexPage.tsx`, imports reveal the service/domain/component boundaries; types describe project and programme shapes; constants describe tabs and layout; state and effects explain loading; handlers explain edits; JSX shows the user experience. Tailwind utility classes can generally be skipped initially when tracing application behaviour: first follow values, handlers, service calls and conditions.

## Further reading

- [Codebase tour](../getting-started/codebase-tour.md)
- [How the application works](../getting-started/how-the-application-works.md)
- [Architecture overview](../architecture/architecture-overview.md)
- [Programme tests](../../src/__tests__/programmeRules.test.ts)
