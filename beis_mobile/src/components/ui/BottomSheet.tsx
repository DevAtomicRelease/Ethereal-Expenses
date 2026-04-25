import React from "react";
import { View, Modal, TouchableOpacity, Text } from "react-native";


export default function BottomSheet({ visible, onClose, children, title }) {
 return (
 <Modal visible={visible} animationType="slide" transparent>
 <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
 <View style={{ backgroundColor: "#131313", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" }}>
 <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700" }}>{title}</Text>
 <TouchableOpacity onPress={onClose}>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>Close</Text>
 </TouchableOpacity>
 </View>
 {children}
 </View>
 </View>
 </Modal>
 );
}
