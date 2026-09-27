# UI styles

The files in this directory define shared and page-specific visual building
blocks using `styled-components`. They expose named static components and
style constants that UI components can reuse instead of repeating layout and
presentation rules.

## Files

- `BackgroundStyles.jsx` exports the shared background-field gradient used by
  the main application and welcome page.
- `MainStyles.jsx` contains the common application shell and control styles:
  page and pane wrappers, header, menu and sidebar elements, section titles,
  form and console elements, log and table helpers, buttons, links, and
  spacing/scrolling components. It also exports layout and color constants.
- `NavigatorStyles.jsx` styles the image navigator and its crosshair lines,
  center box, statistics area, and step-image controls. Its exported constants
  define crosshair dimensions and opacity.
- `StudyStyles.jsx` contains styles specific to Study views, currently the
  compact denominator cell used in scientific tables.
- `WelcomeStyles.jsx` styles the welcome screen, animated image layers, title,
  login panel, subtitle/action, access messages, and unavailable-image notice.

## Shared forms and style variations

The usual pattern is to start with a basic form from
`../utils/ui/styles/CoolStyles.jsx`, then add the rules that make it specific
to a component. `CoolStyles.Block` and `CoolStyles.InlineBlock` provide common
display and alignment behavior; other primitives supply typography, cursor
behavior, positioning, borders, and shadow treatments. A component can compose
these primitives directly or derive a variant from another styled component:

```jsx
static BlueButton = styled(CoolStyles.InlineBlock)`
  ${CoolStyles.pointer}
  color: white;
  background: linear-gradient(15deg, #557799, #7799bb, #bbddff);
`;

static HoverBlueButton = styled(MainStyles.BlueButton)`
  /* Adjust the shared button's colors and hover treatment. */
`;
```

This base-and-variant approach keeps structure and behavior consistent while
allowing visual differences for different contexts or audience preferences.
Reuse an existing primitive when the meaning matches; create a named variant
when a page needs a deliberate difference. Keep shared measurements and colors
as constants when multiple components need to stay coordinated. A formal
user-selectable theme system is not currently provided; alternatives are
expressed as styled variants and shared constants.

The `static` class properties are reusable styled-component definitions, not
runtime state. Use them in JSX as components (for example,
`<MainStyles.SectionTitle />`) and extend them with `styled(BaseComponent)`
when a local variation is needed. Keep state-dependent styling in component
props or data attributes, as the welcome page does for its login-open
transitions.
