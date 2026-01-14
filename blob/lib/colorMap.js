function getColor(classType) {
  const normalizedClass = classType.trim().toLowerCase();

  if (normalizedClass.includes("increase")) {
    return { h: 71.14, s: 68.16, b: 96.08 }; //neon green
  } else if (normalizedClass.includes("decrease")) {
    return { h: 72, s: 8, b: 98.04 }; //neon green light
  }

  //default to red to id problemsssssss
  return { h: 0, s: 85, b: 80 };
}

