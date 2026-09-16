/**
 * Mock Data for AI-Powered Smart Print Tracking System
 * Static test fixtures for Frontend prototype
 */

export const mockCurrentUser = {
  id: "STD-2026-0842",
  name: "Abhinaya N",
  email: "abhinaya.n@college.edu",
  department: "Computer Science & Engineering",
  year: "3rd Year, Semester VI",
  walletBalance: 180.00,
  totalJobsPrinted: 12
};

export const mockStaffUser = {
  id: "STF-XEROX-01",
  name: "Rajesh Kumar",
  role: "Lead Xerox & Print Desk Operator",
  shift: "Morning (08:30 AM - 04:30 PM)",
  deskLocation: "Central Library Ground Floor - Smart Print Bay"
};

export const mockPrinterUnits = [
  {
    id: "PRN-01",
    name: "Xerox WorkCentre 7845",
    type: "Heavy Duty B&W / Duplex",
    status: "Printing",
    currentJobId: "PRT-1001",
    paperLevel: "88%",
    tonerLevel: "74%"
  },
  {
    id: "PRN-02",
    name: "Canon imageRUNNER ADV 4525",
    type: "High Speed B&W",
    status: "Online",
    currentJobId: null,
    paperLevel: "95%",
    tonerLevel: "82%"
  },
  {
    id: "PRN-03",
    name: "Epson EcoTank Pro Color",
    type: "High-Res Color & Photo",
    status: "Printing",
    currentJobId: "PRT-1002",
    paperLevel: "60%",
    tonerLevel: "91%"
  },
  {
    id: "PRN-04",
    name: "HP LaserJet Enterprise MFP",
    type: "Express Single-Sheet",
    status: "Idle",
    currentJobId: null,
    paperLevel: "100%",
    tonerLevel: "65%"
  }
];

export const initialStudentJobs = [
  {
    id: "PRT-1001",
    documentName: "AI_Immersion_Report.pdf",
    date: "Today, 11:15 AM",
    copies: 1,
    pageCount: 24,
    colorMode: "B&W",
    paperSize: "A4",
    pageRange: "All Pages",
    isDoubleSided: true,
    bindingOption: "Spiral Binding",
    cost: 38.00,
    status: "Printing", // Received -> Processing -> Printing -> Ready -> Collected
    stageIndex: 2, // 0: Received, 1: Processing, 2: Printing, 3: Ready, 4: Collected
    estimatedWaitTime: "6 minutes",
    pickupPin: "4821",
    assignedPrinter: "Xerox WorkCentre 7845",
    queuePosition: 2,
    submittedAt: "2026-09-07T11:15:00Z"
  },
  {
    id: "PRT-1002",
    documentName: "Assignment.pdf",
    date: "Today, 10:45 AM",
    copies: 2,
    pageCount: 8,
    colorMode: "B&W",
    paperSize: "A4",
    pageRange: "All Pages",
    isDoubleSided: true,
    bindingOption: "Corner Staple",
    cost: 16.00,
    status: "Printing",
    stageIndex: 2,
    estimatedWaitTime: "4 minutes",
    pickupPin: "7103",
    assignedPrinter: "Xerox WorkCentre 7845",
    queuePosition: 1,
    submittedAt: "2026-09-07T10:45:00Z"
  },
  {
    id: "PRT-1003",
    documentName: "Project_Report.pdf",
    date: "Today, 09:20 AM",
    copies: 1,
    pageCount: 45,
    colorMode: "Color",
    paperSize: "A4",
    pageRange: "All Pages",
    isDoubleSided: true,
    bindingOption: "Soft Binding",
    cost: 125.00,
    status: "Ready",
    stageIndex: 3,
    estimatedWaitTime: "Ready for Pickup",
    pickupPin: "9024",
    assignedPrinter: "Epson EcoTank Pro Color",
    queuePosition: 0,
    submittedAt: "2026-09-07T09:20:00Z"
  },
  {
    id: "PRT-0988",
    documentName: "Resume.pdf",
    date: "Yesterday, 04:30 PM",
    copies: 2,
    pageCount: 2,
    colorMode: "B&W",
    paperSize: "A4",
    pageRange: "All Pages",
    isDoubleSided: false,
    bindingOption: "None",
    cost: 4.00,
    status: "Collected",
    stageIndex: 4,
    estimatedWaitTime: "Completed",
    pickupPin: "3319",
    assignedPrinter: "HP LaserJet Enterprise MFP",
    queuePosition: 0,
    submittedAt: "2026-09-06T16:30:00Z"
  }
];

export const mockPrintJobs = initialStudentJobs;

export const mockNotifications = [
  {
    id: "NOTIF-01",
    title: "Document Ready for Collection",
    message: "Your Project_Report.pdf is ready for collection at Counter 1.",
    time: "10 mins ago",
    status: "Ready",
    isUnread: true
  },
  {
    id: "NOTIF-02",
    title: "Print Job in Progress",
    message: "Your AI_Immersion_Report.pdf is currently printing.",
    time: "25 mins ago",
    status: "Printing",
    isUnread: true
  },
  {
    id: "NOTIF-03",
    title: "Print Request Received",
    message: "Your print request has been received and added to the queue.",
    time: "1 hour ago",
    status: "Received",
    isUnread: false
  }
];

export const initialStaffQueueJobs = [
  {
    queueNo: "#001",
    id: "PRT-1001",
    student: "Abhinaya N",
    studentId: "STD-2026-0842",
    department: "Computer Science",
    fileName: "AI_Report.pdf",
    copies: 2,
    printType: "Colour",
    pages: 24,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "Spiral Binding",
    submittedTime: "Today, 11:15 AM",
    status: "Received",
    estimatedWaitTime: "8 mins",
    pickupPin: "4821",
    assignedPrinter: "Pending Allocation",
    cost: 48.00
  },
  {
    queueNo: "#002",
    id: "PRT-1002",
    student: "Student A",
    studentId: "STD-2026-0120",
    department: "Electronics & Comm.",
    fileName: "Assignment.pdf",
    copies: 1,
    printType: "B&W",
    pages: 8,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "None",
    submittedTime: "Today, 11:05 AM",
    status: "Processing",
    estimatedWaitTime: "5 mins",
    pickupPin: "7103",
    assignedPrinter: "Xerox WorkCentre 7845",
    cost: 12.00
  },
  {
    queueNo: "#003",
    id: "PRT-1003",
    student: "Student B",
    studentId: "STD-2026-0492",
    department: "Mechanical Engg.",
    fileName: "Project.pdf",
    copies: 3,
    printType: "Colour",
    pages: 32,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "Soft Binding",
    submittedTime: "Today, 10:50 AM",
    status: "Printing",
    estimatedWaitTime: "4 mins",
    pickupPin: "5542",
    assignedPrinter: "Epson EcoTank Pro Color",
    cost: 135.00
  },
  {
    queueNo: "#004",
    id: "PRT-1004",
    student: "Student C",
    studentId: "STD-2026-0781",
    department: "Information Tech.",
    fileName: "Resume.pdf",
    copies: 2,
    printType: "B&W",
    pages: 2,
    paperSize: "A4",
    isDoubleSided: false,
    binding: "None",
    submittedTime: "Today, 10:35 AM",
    status: "Ready",
    estimatedWaitTime: "Ready for Pickup",
    pickupPin: "9024",
    assignedPrinter: "Canon imageRUNNER ADV 4525",
    cost: 4.00
  },
  {
    queueNo: "#005",
    id: "PRT-1005",
    student: "Student D",
    studentId: "STD-2026-0914",
    department: "Civil Engineering",
    fileName: "Lab_Manual.pdf",
    copies: 1,
    printType: "B&W",
    pages: 18,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "Spiral Binding",
    submittedTime: "Today, 11:20 AM",
    status: "Received",
    estimatedWaitTime: "10 mins",
    pickupPin: "3189",
    assignedPrinter: "Pending Allocation",
    cost: 34.00
  },
  {
    queueNo: "#006",
    id: "PRT-1006",
    student: "Student E",
    studentId: "STD-2026-0331",
    department: "Electrical Engg.",
    fileName: "Thesis_Draft.pdf",
    copies: 2,
    printType: "Colour",
    pages: 40,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "Hard Binding",
    submittedTime: "Today, 10:40 AM",
    status: "Printing",
    estimatedWaitTime: "6 mins",
    pickupPin: "8821",
    assignedPrinter: "HP LaserJet Enterprise MFP",
    cost: 210.00
  },
  {
    queueNo: "#007",
    id: "PRT-1007",
    student: "Student F",
    studentId: "STD-2026-0619",
    department: "AI & Data Science",
    fileName: "Seminar_Paper.pdf",
    copies: 1,
    printType: "B&W",
    pages: 12,
    paperSize: "A4",
    isDoubleSided: false,
    binding: "None",
    submittedTime: "Today, 10:20 AM",
    status: "Ready",
    estimatedWaitTime: "Ready for Pickup",
    pickupPin: "6472",
    assignedPrinter: "Xerox WorkCentre 7845",
    cost: 12.00
  },
  {
    queueNo: "#008",
    id: "PRT-1008",
    student: "Student G",
    studentId: "STD-2026-0255",
    department: "Architecture",
    fileName: "CAD_Drawings.pdf",
    copies: 4,
    printType: "Colour",
    pages: 6,
    paperSize: "A3",
    isDoubleSided: false,
    binding: "None",
    submittedTime: "Today, 10:10 AM",
    status: "Ready",
    estimatedWaitTime: "Ready for Pickup",
    pickupPin: "1938",
    assignedPrinter: "Epson EcoTank Pro Color",
    cost: 60.00
  },
  {
    queueNo: "#009",
    id: "PRT-1009",
    student: "Student H",
    studentId: "STD-2026-0811",
    department: "Biotechnology",
    fileName: "Bio_Research_Paper.pdf",
    copies: 2,
    printType: "Colour",
    pages: 14,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "None",
    submittedTime: "Today, 11:22 AM",
    status: "Received",
    estimatedWaitTime: "12 mins",
    pickupPin: "2941",
    assignedPrinter: "Pending Allocation",
    cost: 32.00
  },
  {
    queueNo: "#010",
    id: "PRT-1010",
    student: "Student I",
    studentId: "STD-2026-0504",
    department: "Chemical Engg.",
    fileName: "Thermodynamics_Notes.pdf",
    copies: 1,
    printType: "B&W",
    pages: 20,
    paperSize: "A4",
    isDoubleSided: true,
    binding: "Spiral Binding",
    submittedTime: "Today, 11:10 AM",
    status: "Processing",
    estimatedWaitTime: "7 mins",
    pickupPin: "4410",
    assignedPrinter: "Xerox WorkCentre 7845",
    cost: 35.00
  }
];

export const initialCompletedJobs = [
  {
    id: "PRT-0999",
    fileName: "Data_Structures_Notes.pdf",
    student: "Karthik R",
    studentId: "STD-2026-0199",
    completedTime: "Today, 10:30 AM",
    copies: 2,
    printType: "B&W",
    status: "Collected",
    pickupPin: "8120",
    cost: 18.00
  },
  {
    id: "PRT-0998",
    fileName: "Physics_Lab_Manual.pdf",
    student: "Sneha M",
    studentId: "STD-2026-0312",
    completedTime: "Today, 10:15 AM",
    copies: 1,
    printType: "B&W",
    status: "Collected",
    pickupPin: "4921",
    cost: 14.00
  },
  {
    id: "PRT-0997",
    fileName: "Placement_Resume.pdf",
    student: "Arjun V",
    studentId: "STD-2026-0544",
    completedTime: "Today, 09:50 AM",
    copies: 3,
    printType: "B&W",
    status: "Collected",
    pickupPin: "1194",
    cost: 6.00
  },
  {
    id: "PRT-0996",
    fileName: "Campus_Magazine_Draft.pdf",
    student: "Pooja S",
    studentId: "STD-2026-0688",
    completedTime: "Today, 09:30 AM",
    copies: 1,
    printType: "Colour",
    status: "Collected",
    pickupPin: "3022",
    cost: 45.00
  },
  {
    id: "PRT-0995",
    fileName: "Maths_Formula_Sheet.pdf",
    student: "Rahul T",
    studentId: "STD-2026-0721",
    completedTime: "Today, 09:10 AM",
    copies: 2,
    printType: "B&W",
    status: "Collected",
    pickupPin: "7841",
    cost: 8.00
  },
  {
    id: "PRT-0994",
    fileName: "Circuit_Design_Report.pdf",
    student: "Divya K",
    studentId: "STD-2026-0803",
    completedTime: "Today, 08:55 AM",
    copies: 1,
    printType: "Colour",
    status: "Collected",
    pickupPin: "9512",
    cost: 28.00
  },
  {
    id: "PRT-0993",
    fileName: "DBMS_Mini_Project.pdf",
    student: "Manoj P",
    studentId: "STD-2026-0419",
    completedTime: "Today, 08:45 AM",
    copies: 2,
    printType: "B&W",
    status: "Collected",
    pickupPin: "2380",
    cost: 22.00
  },
  {
    id: "PRT-0992",
    fileName: "Operating_Systems_Slides.pdf",
    student: "Ananya B",
    studentId: "STD-2026-0932",
    completedTime: "Today, 08:35 AM",
    copies: 1,
    printType: "Colour",
    status: "Collected",
    pickupPin: "6614",
    cost: 35.00
  },
  {
    id: "PRT-0991",
    fileName: "Environmental_Studies_Essay.pdf",
    student: "Varun J",
    studentId: "STD-2026-0156",
    completedTime: "Today, 08:20 AM",
    copies: 1,
    printType: "B&W",
    status: "Collected",
    pickupPin: "5091",
    cost: 7.00
  },
  {
    id: "PRT-0990",
    fileName: "Internship_Certificate_Copy.pdf",
    student: "Swetha N",
    studentId: "STD-2026-0278",
    completedTime: "Today, 08:10 AM",
    copies: 2,
    printType: "Colour",
    status: "Collected",
    pickupPin: "8419",
    cost: 18.00
  },
  {
    id: "PRT-0989",
    fileName: "Embedded_Systems_Lab.pdf",
    student: "Naveen G",
    studentId: "STD-2026-0391",
    completedTime: "Today, 08:00 AM",
    copies: 1,
    printType: "B&W",
    status: "Collected",
    pickupPin: "3742",
    cost: 16.00
  },
  {
    id: "PRT-0988",
    fileName: "Resume.pdf",
    student: "Abhinaya N",
    studentId: "STD-2026-0842",
    completedTime: "Yesterday, 04:30 PM",
    copies: 2,
    printType: "B&W",
    status: "Collected",
    pickupPin: "3319",
    cost: 4.00
  },
  {
    id: "PRT-0987",
    fileName: "Algorithm_CheatSheet.pdf",
    student: "Praveen S",
    studentId: "STD-2026-0601",
    completedTime: "Yesterday, 04:10 PM",
    copies: 3,
    printType: "Colour",
    status: "Collected",
    pickupPin: "9901",
    cost: 27.00
  },
  {
    id: "PRT-0986",
    fileName: "Digital_Signal_Processing.pdf",
    student: "Kavya L",
    studentId: "STD-2026-0744",
    completedTime: "Yesterday, 03:45 PM",
    copies: 1,
    printType: "B&W",
    status: "Collected",
    pickupPin: "1488",
    cost: 11.00
  },
  {
    id: "PRT-0985",
    fileName: "Microcontroller_Pinout.pdf",
    student: "Siddharth C",
    studentId: "STD-2026-0520",
    completedTime: "Yesterday, 03:20 PM",
    copies: 4,
    printType: "Colour",
    status: "Collected",
    pickupPin: "7263",
    cost: 36.00
  },
  {
    id: "PRT-0984",
    fileName: "Compiler_Design_Notes.pdf",
    student: "Ritu M",
    studentId: "STD-2026-0833",
    completedTime: "Yesterday, 02:50 PM",
    copies: 1,
    printType: "B&W",
    status: "Collected",
    pickupPin: "4509",
    cost: 15.00
  },
  {
    id: "PRT-0983",
    fileName: "Network_Security_Report.pdf",
    student: "Deepak H",
    studentId: "STD-2026-0967",
    completedTime: "Yesterday, 02:15 PM",
    copies: 2,
    printType: "B&W",
    status: "Collected",
    pickupPin: "6127",
    cost: 20.00
  },
  {
    id: "PRT-0982",
    fileName: "Robotics_Workshop_Handout.pdf",
    student: "Harish W",
    studentId: "STD-2026-0182",
    completedTime: "Yesterday, 01:40 PM",
    copies: 1,
    printType: "Colour",
    status: "Collected",
    pickupPin: "8350",
    cost: 30.00
  }
];

export const mockStaffNotifications = [
  {
    id: "STF-NOTIF-01",
    title: "New Print Request",
    message: "New print request received from Abhinaya N (AI_Report.pdf • 2 copies).",
    time: "5 mins ago",
    status: "Received",
    isUnread: true
  },
  {
    id: "STF-NOTIF-02",
    title: "Document Ready for Pickup",
    message: "Project_Report.pdf is ready for collection at Counter 1.",
    time: "12 mins ago",
    status: "Ready",
    isUnread: true
  },
  {
    id: "STF-NOTIF-03",
    title: "Queue Updated",
    message: "Queue updated successfully. Workstation 1 assigned to PRT-1002.",
    time: "25 mins ago",
    status: "Processing",
    isUnread: false
  },
  {
    id: "STF-NOTIF-04",
    title: "Hardware Status",
    message: "Epson EcoTank Pro Color toner replenished to 91%.",
    time: "1 hour ago",
    status: "Hardware",
    isUnread: false
  }
];

export const mockStaffAnalytics = {
  todayTotalJobs: 18,
  avgWaitingTime: "7 min",
  colourPrints: 8,
  bwPrints: 10
};

export const mockQueueStats = {
  activeJobs: 2,
  printingNow: 1,
  readyForCollection: 1,
  completedJobs: 12
};

export const mockPricingRules = {
  bwSinglePage: 1.00,
  bwDoubleSidedSheet: 1.50,
  colorSinglePage: 5.00,
  colorDoubleSidedSheet: 9.00,
  a3Multiplier: 2.0,
  spiralBinding: 20.00,
  softBinding: 35.00,
  hardBinding: 120.00,
  stapling: 0.00
};


