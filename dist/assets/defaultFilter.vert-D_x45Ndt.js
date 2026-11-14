import{Y as p,Z as a}from"./index-CA7AKFwF.js";const s=new p;function d(o,n,r,u,i=!1){const t=s;t.minX=0,t.minY=0,t.maxX=o.width/u|0,t.maxY=o.height/u|0;const e=a.getOptimalTexture(t.width,t.height,u,!1,i);return e.source.uploadMethodId="image",e.source.resource=o,e.source.alphaMode="premultiply-alpha-on-upload",e.frame.width=n/u,e.frame.height=r/u,e.source.emit("update",e.source),e.updateUvs(),e}var c=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;export{d as g,c as v};
