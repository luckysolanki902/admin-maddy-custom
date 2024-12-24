// /src/lib/utils/generalFunctions.js

export function toTitleCase(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // /lib/urlHelper.js

export const joinURLs = (base, path) => {
  if (!base.endsWith('/') && !path.startsWith('/')) {
    return `${base}/${path}`;
  } else if (base.endsWith('/') && path.startsWith('/')) {
    return `${base}${path.slice(1)}`;
  }
  return `${base}${path}`;
};
