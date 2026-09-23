import type { Category, TrackingType } from '@/domain/types';

export interface SeedExercise {
  seedKey: string;
  name: string;
  category: Category;
  trackingType: TrackingType;
  description: string;
}

const shooting = (seedKey: string, name: string, description: string): SeedExercise => ({
  seedKey,
  name,
  category: 'shooting',
  trackingType: 'makes_attempts',
  description,
});

const finishing = (seedKey: string, name: string, description: string): SeedExercise => ({
  seedKey,
  name,
  category: 'finishing',
  trackingType: 'makes_attempts',
  description,
});

const drill = (
  category: Category,
  seedKey: string,
  name: string,
  description: string,
): SeedExercise => ({
  seedKey,
  name,
  category,
  trackingType: 'check',
  description,
});

export const SEED_EXERCISES: SeedExercise[] = [
  // Shooting
  shooting(
    'form_shooting',
    'Form Shooting',
    'Close to the rim with one hand, focus on a clean release, elbow under the ball and follow-through. Take a step back once you are making them consistently.',
  ),
  shooting(
    'free_throws',
    'Free Throws',
    'Shoot from the line with the same routine every time: breathe, bounce, set, shoot. Track makes over attempts to keep the routine honest.',
  ),
  shooting(
    'spot_up_jumpers',
    'Spot-Up Jumpers',
    'Pick fixed spots around the arc or mid-range and shoot from each without dribbling. Focus on footwork into the shot and balance on the landing.',
  ),
  shooting(
    'catch_and_shoot_threes',
    'Catch-and-Shoot Threes',
    'Pass to yourself or get a pass, hop into the catch and shoot the three in one motion. Have the feet ready before the ball arrives.',
  ),
  shooting(
    'corner_threes',
    'Corner Threes',
    'Shoot from both corners, the shortest three on the floor. Stay square to the rim and keep the same arc as from the wing.',
  ),
  shooting(
    'elbow_jumpers',
    'Elbow Jumpers',
    'Catch at the elbow, square up and shoot the mid-range jumper. Alternate elbows and mix in a one-dribble pull-up.',
  ),
  shooting(
    'pull_up_jumpers',
    'Pull-Up Jumpers',
    'Attack with one or two dribbles and stop into a balanced jumper. Keep the shoulders square and go straight up.',
  ),
  shooting(
    'step_back_jumpers',
    'Step-Back Jumpers',
    'Create space with a dribble and a step back, then shoot over the imaginary defender. Land balanced and hold the follow-through.',
  ),
  shooting(
    'bank_shots',
    'Bank Shots',
    'Shoot off the backboard from the 45-degree angles on both wings. Aim for the top corner of the square on the backboard.',
  ),
  // Finishing
  finishing(
    'mikan_drill',
    'Mikan Drill',
    'Alternate right-hand and left-hand layups under the rim without letting the ball hit the floor. Use the backboard and keep a quick, steady rhythm.',
  ),
  finishing(
    'reverse_mikan_drill',
    'Reverse Mikan Drill',
    'Like the Mikan drill but finishing on the opposite side of the rim, going under it. Trains touch and reach around the basket.',
  ),
  finishing(
    'right_hand_layups',
    'Right-Hand Layups',
    'Drive from the right side and finish with the right hand off the correct foot. Focus on the soft touch off the glass.',
  ),
  finishing(
    'left_hand_layups',
    'Left-Hand Layups',
    'Drive from the left side and finish with the left hand off the correct foot. Take it slow first, then add speed.',
  ),
  finishing(
    'reverse_layups',
    'Reverse Layups',
    'Attack the rim and finish on the far side using the rim to shield the ball. Practice with both hands.',
  ),
  finishing(
    'euro_step_layups',
    'Euro Step Layups',
    'Take a long first step in one direction, then a second step the other way to go around a defender, and finish. Keep the ball protected.',
  ),
  finishing(
    'power_layups',
    'Power Layups',
    'Two-foot jump stop near the rim and finish strong through contact. Keep the ball high and use your body as a shield.',
  ),
  finishing(
    'floaters',
    'Floaters',
    'Shoot a high, soft shot over a taller defender from the lane. Release early with a one-foot takeoff and a lot of arc.',
  ),
  finishing(
    'hook_shots',
    'Hook Shots',
    'Finish near the rim with a hook shot: shoulder to the basket, sweep the ball up with the far hand and release softly. Practice both hands.',
  ),
  // Ball handling
  drill(
    'ball_handling',
    'pound_dribbles',
    'Pound Dribbles',
    'Dribble hard and low, as fast as you can control it, with each hand. Keep the head up and the fingertips on the ball.',
  ),
  drill(
    'ball_handling',
    'figure_8',
    'Figure 8',
    'Weave the ball around and between your legs in a figure-eight pattern. Start slow and speed up as the ball stays tight.',
  ),
  drill(
    'ball_handling',
    'ball_wraps',
    'Ball Wraps',
    'Circle the ball around the waist, then each leg, then the head. Keep it tight to the body and change direction.',
  ),
  drill(
    'ball_handling',
    'spider_dribble',
    'Spider Dribble',
    'Dribble the ball between and around your legs in a front-back alternating pattern, switching hands each bounce. Builds quick hands.',
  ),
  drill(
    'ball_handling',
    'two_ball_dribbling',
    'Two-Ball Dribbling',
    'Dribble two balls at once, together and alternating, standing still and moving. Keep the eyes up.',
  ),
  drill(
    'ball_handling',
    'tennis_ball_drill',
    'Tennis Ball Drill',
    'Dribble a basketball while tossing and catching a tennis ball with the other hand. Trains hand-eye coordination and heads-up dribbling.',
  ),
  // Dribbling
  drill(
    'dribbling',
    'crossover',
    'Crossover',
    'Dribble hard from one hand to the other in front of you, low and quick. Sell the move with the shoulders and explode after it.',
  ),
  drill(
    'dribbling',
    'between_the_legs',
    'Between the Legs',
    'Pass the ball between your legs from hand to hand while moving. Keep it low and the head up.',
  ),
  drill(
    'dribbling',
    'behind_the_back',
    'Behind the Back',
    'Wrap the ball behind your back from one hand to the other. Useful to change direction while keeping the ball away from a defender.',
  ),
  drill(
    'dribbling',
    'in_and_out',
    'In-and-Out',
    'Fake a crossover by bringing the ball across and pulling it back to the same hand, then go. Sell the fake with the hips.',
  ),
  drill(
    'dribbling',
    'hesitation',
    'Hesitation',
    'Slow down and rise slightly as if stopping, then accelerate past the defender. The change of pace is the move.',
  ),
  drill(
    'dribbling',
    'cone_zig_zag',
    'Cone Zig-Zag',
    'Dribble through a line of cones changing direction at each one with a crossover or other move. Stay low and keep the pace.',
  ),
  drill(
    'dribbling',
    'full_court_speed_dribble',
    'Full-Court Speed Dribble',
    'Dribble the length of the court at top speed with each hand. Push the ball out in front and keep control.',
  ),
  // Footwork
  drill(
    'footwork',
    'jump_stops',
    'Jump Stops',
    'Stop on two feet at the same time after a dribble, balanced and ready to shoot, pass or pivot. Land with bent knees.',
  ),
  drill(
    'footwork',
    'pivot_series',
    'Pivot Series',
    'Pivot forward and backward on each foot, keeping the other foot planted. Protect the ball and keep the knees bent.',
  ),
  drill(
    'footwork',
    'jab_step_series',
    'Jab Step Series',
    'From a triple threat, jab at the defender and read the reaction. Then shoot, drive or pull back.',
  ),
  drill(
    'footwork',
    'drop_step',
    'Drop Step',
    'With your back to the basket, step around the defender with the inside foot and seal them. Finish with a power move.',
  ),
  drill(
    'footwork',
    'triple_threat_series',
    'Triple Threat Series',
    'Catch the ball in the stance where you can shoot, pass or dribble. Practice the moves out of it with a defender in mind.',
  ),
  drill(
    'footwork',
    'defensive_slides',
    'Defensive Slides',
    'Slide laterally in a low stance without crossing the feet. Keep the hands active and the hips low.',
  ),
  drill(
    'footwork',
    'agility_ladder',
    'Agility Ladder',
    'Run a series of quick-feet patterns through a ladder on the floor. Stay light on the toes and move fast.',
  ),
];
