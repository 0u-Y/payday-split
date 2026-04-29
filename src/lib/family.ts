export type FamilyMember = {
    id: string
    label: string  // 한국어 라벨
    role: string   // 영문 역할
    country: string
    share: number  // 비율 (%)
    color: string  // 아바타·차트 색
    addr: string   // XRPL 주소 (Mock 또는 실제)
  }
  
  // 실제 사용 시 주소는 SenderContext에서 채움
  export const FAMILY_PRESET: FamilyMember[] = [
    { 
      id: "1", 
      label: "어머니", 
      role: "Mom",
      country: "VN", 
      share: 40, 
      color: "#E86A4D", 
      addr: "" 
    },
    { 
      id: "2", 
      label: "아버지", 
      role: "Dad",
      country: "VN", 
      share: 30, 
      color: "#1A2540", 
      addr: "" 
    },
    { 
      id: "3", 
      label: "남동생", 
      role: "Brother",
      country: "VN", 
      share: 15, 
      color: "#3F8A6E", 
      addr: "" 
    },
    { 
      id: "4", 
      label: "여동생", 
      role: "Sister",
      country: "VN", 
      share: 15, 
      color: "#D69431", 
      addr: "" 
    },
  ]