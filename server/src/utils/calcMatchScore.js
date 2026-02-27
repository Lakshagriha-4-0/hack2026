const calcMatchScore = (jobSkills, candidateSkills) => {
    if (!jobSkills || !candidateSkills || jobSkills.length === 0) {
        return { score: 0, matchedSkills: [], missingSkills: jobSkills || [] };
    }

    const jobSkillsLower = jobSkills.map((s) => s.toLowerCase());
    const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());

    const matchedSkills = jobSkills.filter((skill) =>
        candidateSkillsLower.includes(skill.toLowerCase())
    );

    const missingSkills = jobSkills.filter(
        (skill) => !candidateSkillsLower.includes(skill.toLowerCase())
    );

    const score = Math.round((matchedSkills.length / jobSkills.length) * 100);

    return { score, matchedSkills, missingSkills };
};

module.exports = calcMatchScore;
