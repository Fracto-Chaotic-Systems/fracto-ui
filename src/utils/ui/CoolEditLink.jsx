import CoolIconLink from "./CoolIconLink.jsx";
import { pencil_icon } from "./CoolIcons.jsx";
/** Shared pencil action; icon-button behavior is owned by CoolIconLink. */
export default function CoolEditLink(props) {
  return <CoolIconLink {...props} icon={pencil_icon} />;
}
