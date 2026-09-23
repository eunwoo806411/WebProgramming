const root=new URL('../../',import.meta.url);
export const pageUrl=name=>new URL(`pages/${name}/index.html`,root);
export function photoUrl(id){const u=pageUrl('main');u.searchParams.set('photo',id);return u;}
export const assetUrl=path=>new URL(`shared/assets/${path}`,root).href;
