import CategoryDefinition from "./categories/CategoryDefinition.jsx";
import CategorySubject from "./categories/CategorySubject.jsx";
import CategoryStudy from "./categories/CategoryStudy.jsx";
import CategoryTaxonomy from "./categories/CategoryTaxonomy.jsx";
import CategoryDerivation from "./categories/CategoryDerivation.jsx";
import CategoryOperation from "./categories/CategoryOperation.jsx";
import CategoryDialog from "./categories/CategoryDialog.jsx";
import CategoryPaper from "./categories/CategoryPaper.jsx";
import CategoryArticle from "./categories/CategoryArticle.jsx";
import CategoryReference from "./categories/CategoryReference.jsx";
import CategoryDiagram from "./categories/CategoryDiagram.jsx";

export const LORE_CATEGORY_DEFINITION = 1
export const LORE_CATEGORY_SUBJECT = 2
export const LORE_CATEGORY_STUDY = 3
export const LORE_CATEGORY_TAXONOMY = 4
export const LORE_CATEGORY_DERIVATION = 5
export const LORE_CATEGORY_OPERATION = 6
export const LORE_CATEGORY_DIALOG = 7
export const LORE_CATEGORY_PAPER = 8
export const LORE_CATEGORY_ARTICLE = 9
export const LORE_CATEGORY_REFERENCE = 10
export const LORE_CATEGORY_DIAGRAM = 11

export const new_lore_component = (id, width_px, height_px) => {
   switch (id) {
      case  LORE_CATEGORY_DEFINITION:
         return <CategoryDefinition
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_SUBJECT:
         return <CategorySubject
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_STUDY:
         return <CategoryStudy
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_TAXONOMY:
         return <CategoryTaxonomy
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DERIVATION:
         return <CategoryDerivation
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_OPERATION:
         return <CategoryOperation
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DIALOG:
         return <CategoryDialog
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_PAPER:
         return <CategoryPaper
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_ARTICLE:
         return <CategoryArticle
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_REFERENCE:
         return <CategoryReference
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      case  LORE_CATEGORY_DIAGRAM:
         return <CategoryDiagram
            id={-1}
            width_px={width_px}
            height_px={height_px}
         />
      default:
         return `unknown category ${id}`
   }
}
