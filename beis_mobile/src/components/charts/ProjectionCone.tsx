import React from "react";
import { View, Text } from "react-native";
import Svg, { Line, Polygon, Text as SvgText } from "react-native-svg";
import { formatINR } from "@/utils/currency";


export default function ProjectionCone({ currentVelocity, projection30d }) {
 const W = 300; const H = 120;
 const low = projection30d * 0.7;
 const high = projection30d * 1.3;
 const maxVal = high * 1.1;

 const yScale = (v) => H - 20 - ((v / maxVal) * (H - 40));
 const nowY = yScale(currentVelocity * 30);
 const projLowY = yScale(low);
 const projHighY = yScale(high);
 const projMidY = yScale(projection30d);

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>30-Day Projection</Text>
 <Svg width={W} height={H}>
 <Line x1={40} y1={nowY} x2={260} y2={projMidY} stroke="#3B82F6" strokeWidth={2} strokeDasharray="6,4" />
 <Polygon points={`40,${nowY} 260,${projHighY} 260,${projLowY}`}
 fill="#3B82F6" opacity={0.15} />
 <Line x1={260} y1={projHighY} x2={260} y2={projLowY} stroke="#3B82F6" strokeWidth={1.5} />
 <SvgText x={10} y={nowY + 4} fill="#94A3B8" fontSize={10}>Now</SvgText>
 <SvgText x={265} y={projMidY + 4} fill="#F8FAFC" fontSize={10}>{formatINR(projection30d)}</SvgText>
 </Svg>
 </View>
 );
}
