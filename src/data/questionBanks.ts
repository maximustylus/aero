export const ClinicalDecisionNodes = [
  {
    prompt: "RER has just crossed 1.15. What does this indicate?",
    options: ["Anaerobic metabolism and maximal effort", "Hyperventilation artifact", "Equipment calibration failure"],
    correctAnswer: "Anaerobic metabolism and maximal effort"
  },
  {
    prompt: "Early plateau in O2 Pulse with rising HR. Limiting factor?",
    options: ["Cardiovascular stroke volume limitation", "Ventilatory mechanical limitation", "Poor patient motivation"],
    correctAnswer: "Cardiovascular stroke volume limitation"
  },
  {
    prompt: "VE/VCO2 slope is elevated at 42. Associated condition?",
    options: ["Heart failure or pulmonary hypertension", "Simple deconditioning", "Normal physiological response"],
    correctAnswer: "Heart failure or pulmonary hypertension"
  },
  {
    prompt: "Stage 3: 3mm ST segment depression observed. Action?",
    options: ["Terminate the test immediately", "Ask the patient to push harder", "Wait until the end of stage"],
    correctAnswer: "Terminate the test immediately"
  }
];

export const PaediatricDecisionNodes = [
  {
    prompt: "You cannot speak clearly with the mask, but you are okay. What do you do?",
    options: ["Give a big thumbs up", "Try to pull the mask off", "Stop pedalling immediately"],
    correctAnswer: "Give a big thumbs up"
  },
  {
    prompt: "What is the special mask measuring while you exercise?",
    options: ["How well your body uses air", "How fast your legs are moving", "How loud you can breathe"],
    correctAnswer: "How well your body uses air"
  },
  {
    prompt: "Your legs feel very tired and heavy. What is the best action?",
    options: ["Keep trying, point to legs if it hurts", "Close your eyes and sleep", "Jump off the bike without warning"],
    correctAnswer: "Keep trying, point to legs if it hurts"
  },
  {
    prompt: "Why do we put sticky patches and wires on your chest?",
    options: ["To listen to your heart beating", "To make you run faster", "To measure how much you sweat"],
    correctAnswer: "To listen to your heart beating"
  }
];
