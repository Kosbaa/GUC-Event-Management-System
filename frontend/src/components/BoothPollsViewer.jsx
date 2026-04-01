// Updated BoothPollsViewer component with YouTube-style bar poll design
import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { Vote, CheckCircle, Info, TrendingUp, MapPin, Users } from "lucide-react";

export default function BoothPollsViewer() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);

  const allowedRoles = useMemo(
    () => ["Student", "Faculty", "TA", "Staff", "Professor", "Teaching Assistant"],
    []
  );
  const canVote = allowedRoles.includes(user?.role || "");

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/booth-polls");
      setPolls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load polls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const filtered = useMemo(() => polls.filter((p) => String(p.status).toLowerCase() === "open"), [polls]);

  const myVoteFor = (p) => {
    const uid = String(user?._id || user?.id || "");
    const my = (p.votes || []).find((vv) => String(vv.user) === uid);
    return my ? String(my.voteFor) : null;
  };

  const toggleVote = async (pollId, candidateId, isMine) => {
    if (!canVote) {
      toast.error("You are not allowed to vote in this poll");
      return;
    }

    const userId = String(user?._id || user?.id || "");
    const currentPoll = polls.find((poll) => poll._id === pollId);
    const previousVote = currentPoll
      ? currentPoll.votes?.find((vv) => String(vv.user) === userId)
      : null;
    const previousCandidateId = previousVote ? String(previousVote.voteFor) : null;

    const voteKey = `${pollId}:${candidateId}`;
    setVoting(voteKey);

    try {
      if (isMine) {
        await api.delete(`/events/booth-polls/${pollId}/vote`);
        toast.success("Vote removed");
        setPolls((prev) =>
          prev.map((poll) => {
            if (poll._id !== pollId) return poll;
            const tallies = { ...(poll.tallies || {}) };
            if (previousCandidateId) {
              const current = Number(tallies[previousCandidateId] || 0);
              tallies[previousCandidateId] = Math.max(0, current - 1);
            }
            const votes = (poll.votes || []).filter((vv) => String(vv.user) !== userId);
            return { ...poll, tallies, votes };
          })
        );
      } else {
        await api.post(`/events/booth-polls/${pollId}/vote`, { candidateId });
        toast.success("Vote recorded");
        setPolls((prev) =>
          prev.map((poll) => {
            if (poll._id !== pollId) return poll;
            const tallies = { ...(poll.tallies || {}) };
            if (previousCandidateId && previousCandidateId !== candidateId) {
              const current = Number(tallies[previousCandidateId] || 0);
              tallies[previousCandidateId] = Math.max(0, current - 1);
            }
            tallies[candidateId] = (tallies[candidateId] || 0) + 1;
            const votes = [
              ...(poll.votes || []).filter((vv) => String(vv.user) !== userId),
              { user: userId, voteFor: candidateId },
            ];
            return { ...poll, tallies, votes };
          })
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit vote");
    } finally {
      setVoting(null);
    }
  };

  const stats = useMemo(() => {
    const totalPolls = filtered.length;
    const totalVotes = filtered.reduce((acc, poll) => {
      return acc + Object.values(poll.tallies || {}).reduce((a, b) => a + b, 0);
    }, 0);
    const myVotes = filtered.filter((p) => myVoteFor(p) !== null).length;
    
    return { totalPolls, totalVotes, myVotes };
  }, [filtered, user]);

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading polls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Vote className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Booth Conflict Polls
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Vote for your preferred vendor when booth conflicts arise.
            </p>
          </div>
        </div>
      </div>

      {/* Permission Warning */}
      {!canVote && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 p-4">
          <Info className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-300 mb-1">View Only Mode</p>
            <p className="text-sm text-yellow-200/80">
              You can view polls, but only students, professors, TAs, and staff can vote.
            </p>
          </div>
        </div>
      )}

      {/* Polls List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Vote className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Active Polls</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no booth conflict polls open for voting. Check back later!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((p) => {
            const mv = myVoteFor(p);
            const totalVotes = Object.values(p.tallies || {}).reduce((a, b) => a + b, 0);
            const hasVoted = mv !== null;

            return (
              <div 
                key={p._id} 
                className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg"
              >
                {/* Poll Header */}
                <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <MapPin className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400">Location</p>
                          <p className="text-xl font-bold text-white capitalize">
                            {p.location}
                          </p>
                        </div>
                      </div>
                      
                      {/* Voting Instructions */}
                      <div className="flex items-start gap-2 text-sm text-gray-400 ml-13">
                        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {hasVoted
                            ? "You have voted. Click your selection to remove your vote, or click another vendor to change it."
                            : "Choose ONE vendor to cast your vote."}
                        </span>
                      </div>
                    </div>

                    {/* Vote Count Badge */}
                    <div className="flex items-center gap-2 rounded-lg bg-gray-800/60 border border-gray-700 px-4 py-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{totalVotes}</p>
                        <p className="text-xs text-gray-400">vote{totalVotes === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Poll Options */}
                <div className="p-6 space-y-3">
                  {(p.candidates || []).map((c) => {
                    const cid = String(c._id);
                    const votes = p.tallies?.[cid] ?? 0;
                    const isMine = mv === cid;
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isVoting = voting === `${p._id}:${cid}`;
                    const isLeading = votes > 0 && (p.candidates || []).every(
                      (other) => votes >= (p.tallies?.[String(other._id)] ?? 0)
                    );

                    return (
                      <button
                        key={cid}
                        onClick={() => canVote && toggleVote(p._id, cid, isMine)}
                        disabled={!canVote || isVoting}
                        className={`relative w-full cursor-pointer transition-all rounded-xl border p-4 flex items-center gap-3 overflow-hidden group ${
                          isMine 
                            ? "border-blue-500 bg-blue-900/20 ring-2 ring-blue-500/50" 
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/40"
                        } ${!canVote ? "cursor-not-allowed opacity-60" : ""} ${
                          isVoting ? "opacity-50" : ""
                        }`}
                      >
                        {/* Background progress bar */}
                        <div
                          className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-xl ${
                            isMine 
                              ? "bg-gradient-to-r from-blue-600/30 to-blue-500/20" 
                              : "bg-gradient-to-r from-gray-700/30 to-gray-600/20"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />

                        {/* Content */}
                        <div className="relative z-10 flex items-center gap-3 flex-1">
                          {/* Selection indicator */}
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                            isMine 
                              ? "border-blue-500 bg-blue-500" 
                              : "border-gray-600 bg-transparent group-hover:border-gray-500"
                          }`}>
                            {isMine && <CheckCircle className="h-5 w-5 text-white" />}
                          </div>

                          {/* Vendor name */}
                          <div className="flex-1 text-left">
                            <p className="font-bold text-white text-lg">
                              {c.companyName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {votes} vote{votes === 1 ? "" : "s"}
                            </p>
                          </div>

                          {/* Percentage and badges */}
                          <div className="flex items-center gap-2">
                            {isLeading && votes > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-400">
                                <TrendingUp className="h-3 w-3" />
                                Leading
                              </span>
                            )}
                            <div className={`text-lg font-bold ${
                              isMine ? "text-blue-400" : "text-gray-300"
                            }`}>
                              {isVoting ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
                              ) : (
                                `${percentage}%`
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
