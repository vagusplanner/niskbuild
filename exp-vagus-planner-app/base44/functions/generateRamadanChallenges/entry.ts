import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { ramadanYear, startDate } = payload;

    // Challenge templates for each day with escalating difficulty
    const getChallengeTemplate = (day) => {
      const isLastTen = day > 20;
      const isOdd = day % 2 === 1; // Odd nights emphasized

      if (day <= 10) {
        return {
          challenge_type: 'quran_juz',
          title: `Read 1 Juz - Day ${day}`,
          target: 1,
          difficulty: 'easy'
        };
      } else if (day <= 20) {
        return {
          challenge_type: day % 2 === 0 ? 'hadith_reflection' : 'dua_mastery',
          title: day % 2 === 0 ? `Reflect on Hadith - Day ${day}` : `Master a Du'a - Day ${day}`,
          target: 1,
          difficulty: 'medium'
        };
      } else {
        // Last 10 days - escalating difficulty
        return {
          challenge_type: isOdd ? 'qiyam_challenge' : 'quran_juz',
          title: isOdd ? `Qiyam al-Layl - Night ${day - 20} of 10` : `Read 2 Juz - Day ${day}`,
          target: isOdd ? 1 : 2,
          difficulty: 'hard',
          is_last_ten_days: true,
          reward_multiplier: 2
        };
      }
    };

    const challenges = [];
    for (let day = 1; day <= 30; day++) {
      const template = getChallengeTemplate(day);
      const challengeDate = new Date(startDate);
      challengeDate.setDate(challengeDate.getDate() + day - 1);

      challenges.push({
        day,
        title: template.title,
        description: `Complete today's Ramadan challenge to build your spiritual momentum`,
        challenge_type: template.challenge_type,
        target: template.target,
        difficulty: template.difficulty,
        reward_points: template.is_last_ten_days ? 200 : 100,
        is_last_ten_days: template.is_last_ten_days || false,
        ramadan_year: ramadanYear,
        current_progress: 0,
        completed: false
      });
    }

    // Batch create challenges
    await base44.entities.RamadanChallenge.bulkCreate(challenges);

    return Response.json({ 
      success: true, 
      message: `Generated ${challenges.length} Ramadan challenges`,
      challenges 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});