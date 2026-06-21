import ContentDefinition from "./content/ContentDefinition.jsx";
import ContentSubject from "./content/ContentSubject.jsx";
import ContentStudy from "./content/ContentStudy.jsx";
import ContentTaxonomy from "./content/ContentTaxonomy.jsx";
import ContentDerivation from "./content/ContentDerivation.jsx";
import ContentOperation from "./content/ContentOperation.jsx";
import ContentDialog from "./content/ContentDialog.jsx";
import ContentThesis from "./content/ContentThesis.jsx";
import ContentArticle from "./content/ContentArticle.jsx";
import ContentReference from "./content/ContentReference.jsx";
import ContentDiagram from "./content/ContentDiagram.jsx";

export const LORE_CATEGORY_DEFINITION = 1
export const LORE_CATEGORY_SUBJECT = 2
export const LORE_CATEGORY_STUDY = 3
export const LORE_CATEGORY_TAXONOMY = 4
export const LORE_CATEGORY_DERIVATION = 5
export const LORE_CATEGORY_OPERATION = 6
export const LORE_CATEGORY_DIALOG = 7
export const LORE_CATEGORY_THESIS = 8
export const LORE_CATEGORY_ARTICLE = 9
export const LORE_CATEGORY_REFERENCE = 10
export const LORE_CATEGORY_DIAGRAM = 11

export const new_lore_component = (
   category, width_px, height_px) => {
   switch (category.id) {
      case  LORE_CATEGORY_DEFINITION:
         return <ContentDefinition
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_SUBJECT:
         return <ContentSubject
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_STUDY:
         return <ContentStudy
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_TAXONOMY:
         return <ContentTaxonomy
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DERIVATION:
         return <ContentDerivation
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_OPERATION:
         return <ContentOperation
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DIALOG:
         return <ContentDialog
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_THESIS:
         return <ContentThesis
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_ARTICLE:
         return <ContentArticle
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_REFERENCE:
         return <ContentReference
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DIAGRAM:
         return <ContentDiagram
            item_id={-1}
            category={category}
            width_px={width_px}
            height_px={height_px}
         />
      default:
         return `unknown category ${id}`
   }
}
