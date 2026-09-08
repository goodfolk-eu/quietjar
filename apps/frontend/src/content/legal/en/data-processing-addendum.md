---
title: "Data processing addendum"
navTitle: "Data processing"
description: "The data processing addendum covering QuietJar processing of supporter data on behalf of creators: roles, subprocessors, and audits."
lastUpdated: 2026-09-06
order: 4
---

This data processing addendum (DPA) forms part of the terms of service and applies
where QuietJar processes personal data on behalf of a creator. QuietJar is a
product of GoodFolk B.V. i.o.; references to QuietJar mean GoodFolk B.V. i.o. This
DPA implements Article 28 GDPR.

## Definitions

Controller, processor, data subject, personal data, processing, and personal data
breach have the meanings given in the GDPR. Creator is the controller that uses the
service to receive donations. Supporter is a person who donates through the widget
on the creator's website. Donation data is the data created when a supporter
donates, including any personal data it contains. Services are the QuietJar widget,
dashboard, API, and related functionality.

## Roles

For the donation flow, the creator is the controller and QuietJar is the processor.
QuietJar determines only the non-essential technical means of that processing; the
purposes and the lawfulness of the processing are determined by the creator. For
fee accounting, platform security, and statutory bookkeeping, QuietJar is an
independent controller; that processing is described in the privacy policy. Stripe
is a sub-processor for the donation flow and an independent controller for identity
checks and fraud scoring, under its own terms and privacy policy.

## Subject matter and duration

Subject matter is the processing of donation data to provide the services.
Processing starts when the widget script loads on the creator's website and lasts
as long as the retention in this DPA allows. This DPA applies for the term of the
contract between the parties.

## Nature and purpose of processing

Processing is automated: we serve the widget, create the payment session for a
donation, hand the payment to Stripe, record the result, show the supporter a
thank-you, and suppress repeat prompts for a while so supporters are thanked
instead of nagged. Stripe collects the donation into the creator's connected
account, and our fee travels with it as an application fee through Stripe. We
never hold donations. We also process as controller for fee accounting, platform
security, and statutory bookkeeping.

## Categories of data and data subjects

Donation data: amount, currency, payment status, timestamps, payment provider
identifiers, the fee deducted, and the site the widget runs on. From the moment
the widget script loads, the visitor's IP address and user agent. The suppression
identifier that lets the widget step back after a donation. Where a supporter
chooses to provide an email address, for example for a receipt, it is processed by
Stripe. No card or bank credentials reach us. Data subjects are visitors of the
creator's website who donate.

## Obligations of the processor

QuietJar processes personal data only on documented instructions from the creator,
which these terms and the creator's dashboard configuration constitute, and informs
the creator if an instruction appears to infringe data protection law. QuietJar
ensures that persons authorized to process personal data are bound by
confidentiality. It takes the technical and organizational measures described in
this DPA. It assists the creator with data subject rights, security, breach
notification, and impact assessments as described below. It makes available all
information necessary to demonstrate compliance and submits to audits as described
below. It deletes data as described below at the end of the contract.

## Sub-processors

The creator grants general written authorization to engage sub-processors. The
current list, with each sub-processor's role, location, and engagement date, is on
the [subprocessors](/legal/subprocessors/) page. Stripe operates the creator's
Express connected account: it is a sub-processor for the donation flow
and an independent controller for identity checks and fraud scoring, which its own
terms govern. QuietJar notifies creators of new sub-processors at least 30 days
before they begin processing; a creator may object on reasonable data-protection
grounds within that period. If an objection cannot be resolved, the creator may
terminate the affected services. QuietJar binds every sub-processor to obligations
no less protective than this DPA and remains fully liable for their performance.

## International transfers

Processing takes place in the EEA, except that Stripe transfers data to the United
States under the EU-US Data Privacy Framework and standard contractual clauses.
Should any other processing ever take place outside the EEA, QuietJar will rely on
an adequacy decision or, failing that, on standard contractual clauses approved by
the European Commission, and will record the safeguards on the subprocessors page
before the transfer begins.

## Technical and organizational measures

Encryption in transit with TLS for all traffic. Payment details are collected only
inside Stripe's certified infrastructure and are never stored by us. Access to
production systems is restricted to personnel who require it, under individual
credentials, and logged. One-time-code authentication, rate limiting, and abuse
detection protect the platform. No card or bank credentials and no donation
content are included in any log.

## Assistance with data subject rights

Donation data is held by Stripe and by us only as described above. Requests by
supporters concerning their donation are handled by the creator as controller;
QuietJar assists by providing the donation records it holds, and Stripe assists
under its own terms. Where a request concerns data QuietJar holds as controller,
such as creator account data, QuietJar responds within one month.

## Personal data breach notification

QuietJar notifies the creator without undue delay, and in any event within 48
hours, after becoming aware of a personal data breach affecting data processed on
the creator's behalf. The notification states the nature of the breach, the
categories and approximate number of data subjects and records concerned, the
likely consequences, and the measures taken. Because payment credentials never
reach us, a breach cannot expose them. QuietJar does not notify data subjects or
supervisory authorities on the creator's behalf unless instructed in writing.

## Audits and inspections

QuietJar provides the information and documentation needed for the creator to
demonstrate compliance, including the subprocessor list and this DPA. Once a year,
and additionally after a personal data breach, the creator may audit compliance
by questionnaire or review of documentation. On-site inspection is available where
those do not suffice, at a mutually agreed time, on at least 30 days' notice, and
without access to data of other creators.

## Deletion or return of data on termination

The creator may request an export of its donation records before deletion. Records
needed for fee accounting and statutory bookkeeping are retained as long as Dutch
law requires, protected and used only for that purpose. Other supporter data
processed on the creator's behalf is deleted within 30 days of the end of the
contract.

## Liability

Liability between the parties is governed by the limitation of liability in the
terms of service. Nothing in this DPA limits liability that cannot be limited
under mandatory law, and statutory consumer rights are never limited.

## Governing law

This DPA is governed by Dutch law, without regard to conflict-of-law rules.
Mandatory data protection law, in particular the GDPR, applies unchanged.
