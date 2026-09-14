import TextFieldConfig from "./field-config/TextFieldConfig";
import TextAreaFieldConfig from "./field-config/TextAreaFieldConfig";
import NumberFieldConfig from "./field-config/NumberFieldConfig";
import DateFieldConfig from "./field-config/DateFieldConfig";
import SelectFieldConfig from "./field-config/SelectFieldConfig";
import FileFieldConfig from "./field-config/FileFieldConfig";
import DateRangeFieldConfig from "./field-config/DateRangeFieldConfig";
import CustomHtmlConfig from "./field-config/CustomHtmlConfig";
import HeadingFieldConfig from "./field-config/HeadingFieldConfig";
import NoteFieldConfig from "./field-config/NoteFieldConfig";
import GeometryFieldConfig from "./field-config/GeometryFieldConfig";

export default function FieldConfigRenderer(props) {
  const { field } = props;

  switch (field.type) {
    case "text":
      return <TextFieldConfig {...props} />;

    case "textarea":
      return <TextAreaFieldConfig {...props} />;

    case "number":
      return <NumberFieldConfig {...props} />;

    case "date":
      return <DateFieldConfig {...props} />;
      
    case "date_range":
      return <DateRangeFieldConfig {...props} />;

    case "select":
      return <SelectFieldConfig {...props} />;

    case "file":
      return <FileFieldConfig {...props} />;

    case "custom_html":
      return <CustomHtmlConfig {...props} />;

    case "heading":
      return <HeadingFieldConfig {...props} />;

    case "note":
      return <NoteFieldConfig {...props} />;

    case "point":
    case "multipolygon":
    case "line":
      return <GeometryFieldConfig {...props} />;

    default:
      return <TextFieldConfig {...props} />;
  }
}
