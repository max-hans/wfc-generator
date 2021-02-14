export function getBase64Image(img) {
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  var dataURL = canvas.toDataURL("image/png");

  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

export const imgToDataURI = (img) => {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result
        .replace("data:", "")
        .replace(/^.+,/, "");
      res(base64String);
    };
    reader.readAsDataURL(img);
  });
};

export const uriToImage = (type, uri) => {
  const data = `data:${type};base64,${uri}`;
  return data;
};

export const tileToImage = (tile) => {
  return uriToImage(tile.type, tile.uri);
};
