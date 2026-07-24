export type GameRole = 'patient' | 'clinician'

// ── Fisher-Yates shuffle — returns a new shuffled array, never mutates source ─
export function shuffleQuestions<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;        // clinician-level explanation
  patientExplanation: string; // plain-language explanation for patients
  difficulty: 'basic' | 'intermediate' | 'advanced';
  category: string;
}

// ── Clinician question bank ───────────────────────────────────────────────────
export const QUESTIONS: Question[] = [
  // ── Basic ────────────────────────────────────────────────────────────────
  {
    text: "Which variable is the primary indicator of maximal effort in CPET?",
    options: ["RER > 1.15", "Heart Rate drops", "VO₂ decreases linearly"],
    correct: 0,
    explanation: "RER (Respiratory Exchange Ratio) > 1.15 indicates CO₂ production substantially exceeds O₂ consumption, confirming maximal effort.",
    patientExplanation: "When your body works its hardest, you breathe out a lot more carbon dioxide than you take in oxygen. The RER number goes above 1.15, which tells us you gave it your all!",
    difficulty: 'basic', category: 'Maximal Effort',
  },
  {
    text: "What does O₂ Pulse (VO₂/HR) primarily reflect?",
    options: ["Lung capacity", "Stroke volume & peripheral O₂ extraction", "Blood pressure response"],
    correct: 1,
    explanation: "O₂ Pulse represents the amount of oxygen extracted per heartbeat — a surrogate for stroke volume × arteriovenous O₂ difference (Fick principle).",
    patientExplanation: "O₂ Pulse tells us how much oxygen your body uses with each heartbeat — a bigger number means your heart is pumping well and your muscles are absorbing oxygen efficiently.",
    difficulty: 'basic', category: 'O₂ Pulse',
  },
  {
    text: "Ventilatory Threshold 1 (VT1) is best identified by:",
    options: ["Decrease in VE/VCO₂", "First non-linear increase in VE/VO₂", "RER > 1.0"],
    correct: 1,
    explanation: "VT1 corresponds to the aerobic threshold. Buffering of lactate increases CO₂ output, driving VE/VO₂ up while VE/VCO₂ remains flat.",
    patientExplanation: "VT1 is the point where your breathing starts to speed up faster than your oxygen use — like shifting gear. Before this point, exercise feels comfortable; after it, you start to work harder.",
    difficulty: 'basic', category: 'Thresholds',
  },
  {
    text: "A normal physiological response to incremental exercise includes:",
    options: ["Decrease in Tidal Volume", "Linear increase in Heart Rate", "Sharp drop in VCO₂"],
    correct: 1,
    explanation: "Heart rate increases linearly with work rate and VO₂ until maximal effort, following the Fick cardiac output equation.",
    patientExplanation: "As you exercise harder, your heart beats faster in a steady, predictable way. This is completely normal — your heart is working harder to deliver more oxygen to your muscles.",
    difficulty: 'basic', category: 'Exercise Physiology',
  },
  {
    text: "What unit is VO₂ max typically expressed in for clinical CPET?",
    options: ["L/min only", "mL/kg/min", "mmHg"],
    correct: 1,
    explanation: "mL/kg/min normalises oxygen uptake to body mass, allowing comparison across individuals of different sizes and between patient populations.",
    patientExplanation: "VO₂ max is measured in mL/kg/min — millilitres of oxygen per kilogram of body weight per minute. This way, we can fairly compare fitness levels between people of different sizes.",
    difficulty: 'basic', category: 'VO₂',
  },
  {
    text: "On a 9-Panel Plot, which panel best shows the breathing reserve?",
    options: ["VE vs VCO₂", "VE vs Work Rate", "VE vs PETCO₂"],
    correct: 0,
    explanation: "The VE vs VCO₂ panel reveals ventilatory efficiency. A steep VE/VCO₂ slope (>34) suggests impaired gas exchange or heart failure.",
    patientExplanation: "This chart shows how efficiently your lungs work during exercise. If the line is very steep, it means your lungs need to work extra hard to remove carbon dioxide from your blood.",
    difficulty: 'intermediate', category: '9-Panel Plot',
  },
  {
    text: "In a patient with heart failure, what CPET finding is most characteristic?",
    options: ["Elevated VO₂ max", "Oscillatory breathing pattern", "Flat VE/VCO₂ slope"],
    correct: 1,
    explanation: "Periodic oscillatory breathing (Cheyne-Stokes) during or after exercise is a hallmark of advanced heart failure due to prolonged circulatory time.",
    patientExplanation: "In heart failure, breathing can go up and down in a wave-like pattern during exercise. This happens because the heart takes longer than usual to send signals to the brain about how much to breathe.",
    difficulty: 'intermediate', category: 'Pathophysiology',
  },
  {
    text: "VT2 (Respiratory Compensation Point) is identified by:",
    options: [
      "Start of non-linear VE/VO₂ increase, VE/VCO₂ still flat",
      "Rise in both VE/VO₂ AND VE/VCO₂, with fall in PETCO₂",
      "RER first crosses 1.0",
    ],
    correct: 1,
    explanation: "At VT2, bicarbonate buffering is exhausted. Both VE/VO₂ and VE/VCO₂ rise steeply as ventilation tries to compensate for metabolic acidosis. PETCO₂ begins to fall.",
    patientExplanation: "VT2 is the point where you're working very hard and your body can no longer keep up — your breathing goes into overdrive trying to clear the acid building up in your muscles.",
    difficulty: 'intermediate', category: 'Thresholds',
  },
  {
    text: "What does a flat O₂ Pulse plateau during increasing work rate suggest?",
    options: [
      "Excellent cardiovascular fitness",
      "Possible stroke volume limitation or myocardial ischaemia",
      "Respiratory muscle fatigue",
    ],
    correct: 1,
    explanation: "An O₂ Pulse plateau indicates that cardiac output cannot increase further via stroke volume — this may indicate ischaemia, cardiomyopathy, or maximal effort.",
    patientExplanation: "If this number stops rising even when you work harder, it could mean your heart isn't pumping as much blood as it should with each beat — something the doctors will investigate further.",
    difficulty: 'intermediate', category: 'O₂ Pulse',
  },
  {
    text: "For a 10-year-old completing CPET at KKH, which normative dataset is most appropriate?",
    options: [
      "Cooper treadmill norms for adults",
      "Paediatric age/sex/height-specific reference ranges",
      "Predicted max HR of 220 – age",
    ],
    correct: 1,
    explanation: "Paediatric CPET interpretation requires age, sex, and height-specific reference ranges. Using adult norms substantially misclassifies exercise capacity in children.",
    patientExplanation: "We compare your results to other children who are the same age, height, and gender as you — not to adults. That gives us a fair and accurate picture of your fitness.",
    difficulty: 'intermediate', category: 'Paediatrics',
  },
  {
    text: "A VE/VCO₂ slope of 40 with normal PETCO₂ at rest. What does this suggest?",
    options: [
      "Pulmonary arterial hypertension",
      "Normal physiology at high altitude",
      "Exercise-induced laryngeal obstruction",
    ],
    correct: 0,
    explanation: "An elevated VE/VCO₂ slope (>34) with normal resting PETCO₂ (ruling out hyperventilation) is a sensitive marker of pulmonary vascular disease, including PAH.",
    patientExplanation: "When this number is high (above 34) but breathing at rest is normal, it can be a sign that the blood vessels in the lungs are under extra pressure — something the doctor will check for.",
    difficulty: 'advanced', category: 'Pathophysiology',
  },
  {
    text: "In the POWERS programme, which CPET parameter best guides aerobic prescription intensity?",
    options: [
      "Age-predicted HRmax (220 – age)",
      "Heart rate at VT1 (first ventilatory threshold)",
      "Resting blood pressure",
    ],
    correct: 1,
    explanation: "Exercise prescription anchored to VT1 ensures training remains in the aerobic zone, maximising benefit and minimising risk — particularly important in oncology rehabilitation.",
    patientExplanation: "We use your heart rate at the first breathing threshold (VT1) to set the right exercise intensity for you — not too easy, not too hard, just right for your heart and body to benefit safely.",
    difficulty: 'advanced', category: 'Exercise Prescription',
  },
  {
    text: "Which combination confirms 'poor effort' rather than true cardiovascular limitation?",
    options: [
      "RER < 1.05 + plateau in VO₂ + HRmax ≥ predicted",
      "RER < 1.05 + no VO₂ plateau + HR well below predicted max",
      "RER > 1.15 + VO₂ plateau + appropriate HR response",
    ],
    correct: 1,
    explanation: "Low RER combined with HR well below age-predicted max and no VO₂ plateau suggests submaximal effort rather than true physiological limitation — requiring repeat testing or motivation strategies.",
    patientExplanation: "Sometimes the numbers tell us the test didn't capture your true maximum — your heart rate stayed low and breathing didn't push its limits. That's okay! We can repeat the test with extra encouragement.",
    difficulty: 'advanced', category: 'Test Interpretation',
  },
  {
    text: "During CPET in a post-Fontan patient, which finding is expected?",
    options: [
      "Normal VO₂ max and VE/VCO₂ slope",
      "Severely reduced VO₂ max with markedly elevated VE/VCO₂",
      "Elevated resting HR but normal exercise response",
    ],
    correct: 1,
    explanation: "Fontan circulation lacks a subpulmonary ventricle, causing chronotropic incompetence, reduced cardiac output, and impaired pulmonary blood flow — resulting in low VO₂ max and high VE/VCO₂ slope.",
    patientExplanation: "After Fontan surgery, the heart works differently. Exercise capacity is usually lower than average, and breathing has to work harder — but understanding this helps us plan the best exercise programme for you.",
    difficulty: 'advanced', category: 'Congenital Heart Disease',
  },

  // ── Intermediate ──────────────────────────────────────────────────────────
  {
    text: "On the Wasserman 9-Panel Plot, which panel pair best identifies VT1 using the V-slope method?",
    options: ["VO₂ vs Work Rate", "VCO₂ vs VO₂", "VE vs VCO₂"],
    correct: 1,
    explanation: "The V-slope method plots VCO₂ against VO₂. VT1 is identified where the slope steepens from ~1.0 to >1.0, indicating excess CO₂ production from bicarbonate buffering of lactate.",
    patientExplanation: "Scientists use a special graph that shows how your body switches from easy breathing to harder breathing. The point where the line bends tells us your first threshold.",
    difficulty: 'intermediate', category: '9-Panel Plot',
  },
  {
    text: "Which CPET finding most strongly suggests exercise-induced dynamic hyperinflation in a COPD patient?",
    options: [
      "Rising PETCO₂ during exercise",
      "Breathing reserve <15% with operating lung volumes rising",
      "VE/VCO₂ slope <30",
    ],
    correct: 1,
    explanation: "Dynamic hyperinflation in COPD is characterised by rising end-expiratory lung volume, reducing breathing reserve. VE approaches MVV early, limiting exercise despite preserved cardiac function.",
    patientExplanation: "In some lung conditions, air gets trapped during exercise, making breathing feel more and more difficult — like trying to breathe into an already-full balloon.",
    difficulty: 'intermediate', category: 'Pathophysiology',
  },
  {
    text: "A CPET shows VO₂ at AT = 55% of predicted VO₂ peak. What does this indicate?",
    options: [
      "Normal aerobic capacity",
      "Reduced aerobic capacity with early lactate accumulation",
      "Ventilatory limitation",
    ],
    correct: 1,
    explanation: "AT/VO₂ peak ratio normally exceeds 40%. A ratio of 55% AT/peak VO₂ is normal, but if the AT itself is low (e.g. <40% predicted VO₂max), it indicates reduced oxidative capacity and early reliance on anaerobic metabolism.",
    patientExplanation: "This number tells us how much of your fitness capacity you can use before your muscles start to get tired. A lower number means your muscles get tired earlier.",
    difficulty: 'intermediate', category: 'Thresholds',
  },
  {
    text: "In an obese patient with exertional dyspnoea, which CPET pattern best supports obesity hypoventilation rather than deconditioning?",
    options: [
      "Low VO₂ peak, normal VE/VCO₂, elevated PETCO₂ at rest and exercise",
      "Low VO₂ peak, elevated VE/VCO₂, normal breathing reserve",
      "Normal VO₂ peak, low O₂ pulse plateau",
    ],
    correct: 0,
    explanation: "Obesity hypoventilation syndrome (OHS) is characterised by alveolar hypoventilation: elevated resting and exercise PETCO₂ with relative hypoventilation (normal or low VE/VCO₂ slope despite high CO₂ load).",
    patientExplanation: "Some people with obesity have difficulty breathing deeply enough, which means CO₂ builds up in the blood. The CPET can detect this pattern specifically.",
    difficulty: 'intermediate', category: 'Pathophysiology',
  },
  {
    text: "What does a low peak heart rate relative to predicted (chronotropic incompetence) imply during CPET?",
    options: [
      "Excellent cardiovascular fitness",
      "Possible sinus node dysfunction or beta-blocker effect",
      "Hyperventilation syndrome",
    ],
    correct: 1,
    explanation: "Chronotropic incompetence — failure to reach ≥80% age-predicted HRmax — indicates impaired sinus node response. Causes include sick sinus syndrome, heavy beta-blockade, cardiac autonomic neuropathy, or advanced heart failure.",
    patientExplanation: "When your heart doesn't speed up as fast as expected during exercise, it could mean the heart's natural pacemaker isn't working at full capacity, or that certain medicines are slowing it down.",
    difficulty: 'intermediate', category: 'Exercise Physiology',
  },
  {
    text: "In a child with repaired Tetralogy of Fallot, which CPET finding is most concerning?",
    options: [
      "Mildly reduced VO₂ peak at 75% predicted",
      "O₂ pulse plateau with ST changes and ventricular ectopics",
      "Breathing reserve of 20% at peak",
    ],
    correct: 1,
    explanation: "An O₂ pulse plateau with concurrent ST changes and ventricular ectopics in repaired ToF suggests residual right ventricular outflow tract obstruction, pulmonary regurgitation, or RV-related ischaemia — requiring urgent cardiology review.",
    patientExplanation: "After heart surgery, the doctors monitor your heart very carefully during exercise. If certain abnormal signs appear, the team will look more closely to make sure everything is working safely.",
    difficulty: 'intermediate', category: 'Paediatrics',
  },

  // ── Advanced ─────────────────────────────────────────────────────────────
  {
    text: "A cancer patient on anthracycline chemotherapy shows a VE/VCO₂ slope of 38 and reduced VO₂ peak. The most likely mechanism is:",
    options: [
      "Chemotherapy-induced pulmonary fibrosis",
      "Cardiotoxic cardiomyopathy reducing stroke volume",
      "Skeletal muscle wasting only",
    ],
    correct: 1,
    explanation: "Anthracyclines cause dose-dependent cardiomyopathy, reducing stroke volume and cardiac output. This lowers VO₂ peak via the Fick equation and elevates VE/VCO₂ due to reduced pulmonary perfusion and increased physiological dead space.",
    patientExplanation: "Some cancer medicines can affect how the heart pumps. The CPET helps us see if the heart is working as well as it should, so we can adjust your treatment and exercise plan safely.",
    difficulty: 'advanced', category: 'Oncology',
  },
  {
    text: "In the POWERS prehabilitation protocol, a patient achieves VO₂ at VT1 of 14 mL/kg/min. The target training heart rate should be set at:",
    options: [
      "60% of HRmax (age-predicted formula)",
      "Heart rate recorded at VT1 during CPET",
      "Resting heart rate + 20 bpm",
    ],
    correct: 1,
    explanation: "POWERS prescribes aerobic exercise anchored precisely to VT1 heart rate — not age-predicted formulas — because VT1 defines the upper limit of the aerobic (fat-oxidation dominant) zone. This maximises training adaptation while minimising risk in oncology patients.",
    patientExplanation: "We use your actual heart rate from the CPET test — not a formula — to give you the best and safest exercise target. It's personalised just for you.",
    difficulty: 'advanced', category: 'Exercise Prescription',
  },
  {
    text: "Which blood-gas pattern at peak CPET confirms ventilation-perfusion mismatch rather than true shunt?",
    options: [
      "PaO₂ falls with high P(A-a)O₂; PaO₂ corrects with 100% O₂",
      "PaO₂ falls; P(A-a)O₂ normal; SaO₂ maintained",
      "PaO₂ stable; PETCO₂ rises; SaO₂ falls",
    ],
    correct: 0,
    explanation: "V/Q mismatch causes P(A-a)O₂ widening; the hypoxaemia corrects with supplemental oxygen because the mismatched alveoli are still recruitable. True shunt (intracardiac or intrapulmonary) does not correct with 100% O₂.",
    patientExplanation: "Some areas of the lung can have a mismatch between air and blood flow. Extra oxygen through a mask can fix this type of problem, helping the doctors understand exactly what kind of breathing issue is happening.",
    difficulty: 'advanced', category: 'Gas Exchange',
  },
  {
    text: "A paediatric oncology patient post-HSCT has VO₂ peak 52% predicted and VE/VCO₂ slope 42. The MOST appropriate next investigation is:",
    options: [
      "Repeat CPET in 3 months without intervention",
      "Echocardiography and pulmonary function testing to stratify cardiac vs pulmonary cause",
      "Immediately start high-intensity interval training",
    ],
    correct: 1,
    explanation: "Post-HSCT CPET abnormalities reflect multiple potential mechanisms: graft-related cardiomyopathy, pulmonary GVHD, or skeletal muscle deconditioning. Echo and PFTs stratify the dominant mechanism before prescribing exercise intensity.",
    patientExplanation: "After a bone marrow transplant, some changes can happen to the heart and lungs. The doctors will do more tests to understand exactly what's going on before planning the best exercise programme for you.",
    difficulty: 'advanced', category: 'Oncology',
  },
  {
    text: "In exercise testing for pre-operative risk stratification, a VO₂ peak below which threshold confers high surgical mortality risk for major abdominal surgery?",
    options: ["< 20 mL/kg/min", "< 10 mL/kg/min", "< 15 mL/kg/min"],
    correct: 1,
    explanation: "A VO₂ peak <10 mL/kg/min is associated with significantly elevated peri-operative mortality for major non-cardiac surgery. The AT <11 mL/kg/min threshold is also commonly used as a high-risk marker.",
    patientExplanation: "Before a big operation, doctors check how well your heart and lungs work. A lower number means the surgical team needs to take extra care and may adjust the operation plan to keep you safe.",
    difficulty: 'advanced', category: 'Perioperative',
  },
  {
    text: "Isocapnic buffering phase during CPET refers to:",
    options: [
      "The interval between VT1 and VT2 where PETCO₂ remains stable",
      "The resting equilibration period before exercise",
      "The post-exercise CO₂ recovery slope",
    ],
    correct: 0,
    explanation: "Between VT1 and VT2, rising VE eliminates the excess CO₂ from bicarbonate buffering while PETCO₂ remains stable — isocapnia is maintained. Above VT2 (RCP), PETCO₂ falls as ventilation hyperventilates beyond CO₂ production.",
    patientExplanation: "There's a zone of exercise intensity — between two thresholds — where your breathing is working hard to clear waste gas but your blood chemistry stays balanced. Above this zone, your body really starts to struggle.",
    difficulty: 'advanced', category: 'Thresholds',
  },
  {
    text: "Excess VO₂ (ΔVO₂/ΔWork Rate < 8.5 mL/min/W) during ramp CPET suggests:",
    options: [
      "Hyperventilation artefact",
      "Cardiovascular limitation — cardiac output failing to increase proportionally with demand",
      "Excellent athletic efficiency",
    ],
    correct: 1,
    explanation: "Normally ΔVO₂/ΔWR ≈ 10 mL/min/W. A depressed slope (<8.5) indicates the oxygen cost per watt cannot be met — consistent with cardiac output limitation, mitochondrial myopathy, or severe anaemia limiting oxygen delivery.",
    patientExplanation: "When the body can't keep up its oxygen supply as exercise gets harder, the line on the graph flattens out. This tells doctors the heart or blood may not be delivering enough oxygen to the muscles.",
    difficulty: 'advanced', category: 'VO₂',
  },
];

// ── Patient question bank (Year 5–7 reading level, 3 options, 5-orb cadence) ─
export const PATIENT_QUESTIONS: Question[] = [
  {
    text: "What does CPET stand for?",
    options: ["Cardiopulmonary Exercise Test", "Chest Pain Exercise Therapy", "Cardio Physical Endurance Trial"],
    correct: 0,
    explanation: "CPET stands for Cardiopulmonary Exercise Test — a special test that measures how your heart and lungs work together while you exercise.",
    patientExplanation: "CPET stands for Cardiopulmonary Exercise Test — a special test that measures how your heart and lungs work together while you exercise.",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "Which organ pumps blood around your body during exercise?",
    options: ["Lungs", "Heart", "Liver"],
    correct: 1,
    explanation: "The heart is a muscle that pumps blood to every part of your body. During exercise, it beats faster to deliver more oxygen to your working muscles.",
    patientExplanation: "The heart is a muscle that pumps blood to every part of your body. During exercise, it beats faster to deliver more oxygen to your working muscles.",
    difficulty: 'basic', category: 'Body Systems',
  },
  {
    text: "What happens to your heart rate when you run faster?",
    options: ["It stays the same", "It gets slower", "It gets faster"],
    correct: 2,
    explanation: "As you run faster, your muscles need more oxygen. Your heart beats faster to pump more blood — and more oxygen — to keep up with the demand.",
    patientExplanation: "As you run faster, your muscles need more oxygen. Your heart beats faster to pump more blood — and more oxygen — to keep up with the demand.",
    difficulty: 'basic', category: 'Exercise Basics',
  },
  {
    text: "What gas do your muscles use for energy during exercise?",
    options: ["Carbon dioxide", "Oxygen", "Nitrogen"],
    correct: 1,
    explanation: "Your muscles use oxygen to turn food into energy. The harder you exercise, the more oxygen your muscles need — which is why you breathe faster.",
    patientExplanation: "Your muscles use oxygen to turn food into energy. The harder you exercise, the more oxygen your muscles need — which is why you breathe faster.",
    difficulty: 'basic', category: 'Exercise Basics',
  },
  {
    text: "What gas do you breathe OUT when you exercise?",
    options: ["Oxygen", "Helium", "Carbon dioxide"],
    correct: 2,
    explanation: "When your muscles use oxygen for energy, they produce carbon dioxide as a waste product. You breathe it out through your lungs.",
    patientExplanation: "When your muscles use oxygen for energy, they produce carbon dioxide as a waste product. You breathe it out through your lungs.",
    difficulty: 'basic', category: 'Body Systems',
  },
  {
    text: "During the CPET test, what do you wear over your face?",
    options: ["A swimming mask", "A special breathing mask", "Goggles"],
    correct: 1,
    explanation: "You wear a special breathing mask (or mouthpiece) connected to a machine that measures exactly how much oxygen you breathe in and how much carbon dioxide you breathe out.",
    patientExplanation: "You wear a special breathing mask (or mouthpiece) connected to a machine that measures exactly how much oxygen you breathe in and how much carbon dioxide you breathe out.",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "VO₂ max tells us about your body's ability to:",
    options: ["Hold your breath", "Use oxygen during hard exercise", "Digest food quickly"],
    correct: 1,
    explanation: "VO₂ max is the maximum amount of oxygen your body can use when you exercise as hard as you can. A higher number means better fitness.",
    patientExplanation: "VO₂ max is the maximum amount of oxygen your body can use when you exercise as hard as you can. A higher number means better fitness.",
    difficulty: 'basic', category: 'VO₂',
  },
  {
    text: "Why does your breathing get faster when you exercise hard?",
    options: [
      "Your lungs need to cool down",
      "Your body needs more oxygen and needs to remove carbon dioxide",
      "You are feeling scared",
    ],
    correct: 1,
    explanation: "Faster breathing brings in more oxygen for your muscles and gets rid of the carbon dioxide building up — keeping your blood chemistry balanced.",
    patientExplanation: "Faster breathing brings in more oxygen for your muscles and gets rid of the carbon dioxide building up — keeping your blood chemistry balanced.",
    difficulty: 'basic', category: 'Exercise Basics',
  },
  {
    text: "What does a higher fitness level usually mean for your heart rate at rest?",
    options: ["A higher resting heart rate", "A lower resting heart rate", "No change at all"],
    correct: 1,
    explanation: "Fit people often have a lower resting heart rate because their heart is stronger and pumps more blood with each beat, so it doesn't need to beat as often.",
    patientExplanation: "Fit people often have a lower resting heart rate because their heart is stronger and pumps more blood with each beat, so it doesn't need to beat as often.",
    difficulty: 'basic', category: 'Fitness',
  },
  {
    text: "If a CPET test shows your heart and lungs are working well, what does that mean?",
    options: [
      "You need more medicine",
      "Your body handles exercise safely and efficiently",
      "You should avoid exercise",
    ],
    correct: 1,
    explanation: "A good CPET result means your heart and lungs are working as a great team during exercise — which is a really positive sign for your health!",
    patientExplanation: "A good CPET result means your heart and lungs are working as a great team during exercise — which is a really positive sign for your health!",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "Which of these activities would make your heart beat the fastest?",
    options: ["Reading a book", "Walking slowly", "Sprinting as fast as you can"],
    correct: 2,
    explanation: "Sprinting requires the most energy, so your heart beats very fast to pump oxygen to your muscles quickly. This is why we use hard exercise in the CPET test.",
    patientExplanation: "Sprinting requires the most energy, so your heart beats very fast to pump oxygen to your muscles quickly. This is why we use hard exercise in the CPET test.",
    difficulty: 'basic', category: 'Exercise Basics',
  },
  {
    text: "What part of your body takes in oxygen from the air when you breathe?",
    options: ["Heart", "Stomach", "Lungs"],
    correct: 2,
    explanation: "Your lungs are like sponges that absorb oxygen from every breath. The oxygen then travels into your blood, which carries it to every cell in your body.",
    patientExplanation: "Your lungs are like sponges that absorb oxygen from every breath. The oxygen then travels into your blood, which carries it to every cell in your body.",
    difficulty: 'basic', category: 'Body Systems',
  },
  {
    text: "When you feel a 'stitch' in your side during hard exercise, what is most likely happening?",
    options: ["Your lungs are too small", "Your diaphragm muscle is getting tired", "Your heart is beating too fast"],
    correct: 1,
    explanation: "A side stitch is thought to be a cramp or spasm in the diaphragm — the dome-shaped muscle under your lungs that helps you breathe. It happens when the diaphragm is working very hard.",
    patientExplanation: "A side stitch is thought to be a cramp or spasm in the diaphragm — the dome-shaped muscle under your lungs that helps you breathe. It happens when the diaphragm is working very hard.",
    difficulty: 'basic', category: 'Exercise Basics',
  },
  {
    text: "During the CPET, the team monitors your heart using sticky patches called:",
    options: ["Stethoscopes", "ECG electrodes", "Pulse oximeters"],
    correct: 1,
    explanation: "ECG electrodes are small sticky patches placed on your chest, arms, and legs. They detect the electrical signals from your heartbeat and let the clinical team monitor your heart rhythm safely throughout the test.",
    patientExplanation: "ECG electrodes are small sticky patches placed on your chest, arms, and legs. They detect the electrical signals from your heartbeat and let the clinical team monitor your heart rhythm safely throughout the test.",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "Why does your face go red when you exercise hard?",
    options: ["You are embarrassed", "Blood vessels near the skin open up to release heat", "Your skin is producing more oxygen"],
    correct: 1,
    explanation: "Exercise generates a lot of heat. Your body sends more blood to small vessels near the skin surface so the heat can escape — like opening a window. That's why you look flushed and feel warm.",
    patientExplanation: "Exercise generates a lot of heat. Your body sends more blood to small vessels near the skin surface so the heat can escape — like opening a window. That's why you look flushed and feel warm.",
    difficulty: 'basic', category: 'Body Systems',
  },
  {
    text: "The treadmill in a CPET test usually gets harder over time because:",
    options: ["It gets faster and steeper every few minutes", "The room temperature increases", "The mask gets tighter"],
    correct: 0,
    explanation: "A ramp CPET test gradually increases speed and/or incline every few minutes. This steady increase challenges your heart and lungs in a controlled way until you reach your maximum — usually in about 8–12 minutes.",
    patientExplanation: "A ramp CPET test gradually increases speed and/or incline every few minutes. This steady increase challenges your heart and lungs in a controlled way until you reach your maximum — usually in about 8–12 minutes.",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "What is the job of red blood cells?",
    options: ["Fight infections", "Carry oxygen around the body", "Digest food"],
    correct: 1,
    explanation: "Red blood cells contain haemoglobin, a protein that grabs oxygen in the lungs and carries it through the bloodstream to every muscle and organ. During exercise, your muscles need more, so more blood gets pumped around.",
    patientExplanation: "Red blood cells contain haemoglobin, a protein that grabs oxygen in the lungs and carries it through the bloodstream to every muscle and organ. During exercise, your muscles need more, so more blood gets pumped around.",
    difficulty: 'basic', category: 'Body Systems',
  },
  {
    text: "After your CPET test, the doctors use the results to:",
    options: ["Decide if you need surgery immediately", "Understand your fitness and design a safe exercise plan for you", "Tell your school you cannot do PE"],
    correct: 1,
    explanation: "CPET results give a detailed picture of how your heart, lungs, and muscles work together. Doctors use this to plan the safest and most effective exercise programme — whether that's for recovery, sport, or staying healthy.",
    patientExplanation: "CPET results give a detailed picture of how your heart, lungs, and muscles work together. Doctors use this to plan the safest and most effective exercise programme — whether that's for recovery, sport, or staying healthy.",
    difficulty: 'basic', category: 'CPET Basics',
  },
  {
    text: "If your VO₂ max improves after a few months of exercise training, this means:",
    options: ["Your lungs got bigger", "Your heart and muscles got better at using oxygen", "You need to exercise less"],
    correct: 1,
    explanation: "With regular aerobic training, your heart pumps more blood per beat, your muscles grow more mitochondria (the 'engines' of cells), and your blood carries oxygen more efficiently. All of this raises your VO₂ max.",
    patientExplanation: "With regular exercise, your heart and muscles get stronger and better at using oxygen. VO₂ max going up means your fitness is improving — and that's great news for your health!",
    difficulty: 'basic', category: 'Fitness',
  },
];
