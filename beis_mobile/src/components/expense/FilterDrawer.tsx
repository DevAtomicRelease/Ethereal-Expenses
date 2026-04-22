import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { CATEGORY_LIST } from "@/utils/categories";


export default function FilterDrawer({ visible, onClose, onApply }) {
 const [selected, setSelected] = useState(new Set());

 const toggle = (cat) => {
 const next = new Set(selected);
 if (next.has(cat)) next.delete(cat); else next.add(cat);
 setSelected(next);
 };

 return (
 <BottomSheet visible={visible} onClose={onClose} title="Filter">
 <ScrollView style={{ maxHeight: 300 }}>
 <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
 {CATEGORY_LIST.map((cat) => (
 <Button key={cat} title={cat.replace("_", " ")}
 variant={selected.has(cat) ? "primary" : "secondary"}
 onPress={() => toggle(cat)}
 style={{ paddingVertical: 10, paddingHorizontal: 16 }} />
 ))}
 </View>
 </ScrollView>
 <Button title="Apply" onPress={() => { onApply({ categories: [...selected] }); onClose(); }} style={{ marginTop: 8 }} />
 </BottomSheet>
 );
}
