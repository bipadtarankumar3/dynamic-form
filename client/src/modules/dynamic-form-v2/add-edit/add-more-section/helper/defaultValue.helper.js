  export  const getDefaultValueByType = (field) => {
    // explicit default from schema always wins
    if (field?.default !== undefined) {
      return field?.default;
    }

    switch (field?.type) {
      case "text":
      case "textarea":
        return undefined;

      case "number":
        return null;

      case "date":
        return null;

      case "date_range":
        return null;

      case "select":
        return field?.multiple ? [] : undefined;

      case "file":
        return [];

      default:
        return undefined;
    }
  };